from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
offers=[];requests=[];signals={}
def transfers(ctx,role):
 def route(r):
  body=r.request.post_data_json;op=body['operation'];x=body.get('payload',{});data={}
  if op=='offers':data=offers
  elif op=='publish':offers.append(dict(x,id='offer-1',owner='user-admin'));data=offers[-1]
  elif op=='request':requests.append(dict(id='request-1',offer_id=x['offer'],reader='user-reader',owner='user-admin',status='pending',title=offers[0]['title'],items=offers[0]['items'],nome='Leitor',login='reader'))
  elif op=='list':data=requests
  elif op=='accept':requests[0]['status']='accepted';signals.clear()
  elif op=='complete':requests[0]['status']='completed'
  elif op=='signal':
   if 'signal' in x:signals[role]=x['signal']
   data={'signal':signals.get('reader' if role=='admin' else 'admin')}
  r.fulfill(content_type='application/json',body=json.dumps({'data':data}))
 ctx.route('**/api/account?action=transfers*',route)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-features=WebRtcHideLocalIpsWithMdns'])
 admin=b.new_context(service_workers='block');connect(admin,'admin');transfers(admin,'admin')
 reader=b.new_context(service_workers='block');connect(reader);transfers(reader,'reader')
 fake="""window.sent=[];class FakePeer {constructor(){this.iceGatheringState='complete';}createDataChannel(){return this.channel={readyState:'open',bufferedAmount:0,send:v=>window.sent.push(typeof v==='string'?v:Array.from(new Uint8Array(v.buffer||v))),close(){}};}async createOffer(){return {type:'offer',sdp:'a=candidate:simulated'};}async createAnswer(){return {type:'answer',sdp:'a=candidate:simulated'};}async setLocalDescription(s){this.localDescription={...s,toJSON:()=>s};}async setRemoteDescription(s){if(s.type==='offer'){this.channel=window.incoming={send:v=>window.sent.push(v)};this.ondatachannel({channel:this.channel});setTimeout(()=>this.channel.onopen?.(),0);}else setTimeout(()=>this.channel.onopen?.(),0);}close(){}addEventListener(){}}window.RTCPeerConnection=FakePeer;"""
 admin.add_init_script(fake);reader.add_init_script(fake)
 a=admin.new_page();u=reader.new_page();errors=[]
 for page in [a,u]:page.on('pageerror',lambda e:errors.append(str(e)))
 login(a);a.locator('nav [data-ir=biblioteca]').click();a.locator('#tabDevice').click();a.locator('#localHQInput').set_input_files({'name':'HQ direta.txt','mimeType':'text/plain','buffer':b'Conteudo enviado diretamente.'});a.wait_for_selector('[data-device-library] .cartao')
 a.locator('nav [data-ir=perfil]').click();a.locator('.direct-transfer details summary').click();a.locator('[data-offer-items] option').wait_for(state='attached');bookid=a.locator('[data-offer-items] option').first.get_attribute('value');a.locator('[data-offer-items]').select_option(bookid);a.locator('[data-offer-publish]').click();a.wait_for_selector('[data-transfer-offers] article')
 login(u);u.locator('nav [data-ir=perfil]').click();u.locator('[data-transfer-request]').click()
 a.locator('[data-transfer-refresh]').click();a.locator('[data-transfer-send]').click()
 a.wait_for_function("document.querySelector('[data-transfer-status]').textContent.includes('Pedido aprovado')",timeout=40000)
 u.locator('[data-transfer-refresh]').click();u.locator('[data-transfer-receive]').click()
 a.wait_for_function("window.sent.includes('END')")
 for chunk in a.evaluate('window.sent'):
  u.evaluate("chunk=>window.incoming.onmessage({data:Array.isArray(chunk)?new Uint8Array(chunk).buffer:chunk})",chunk)
 u.wait_for_function("document.querySelector('[data-transfer-status]').textContent.includes('1 HQ(s) importadas')")
 assert requests[0]['status']=='completed'
 result=u.evaluate("""async()=>{const lib=EQLocalLibrary.create(()=>({id:'user-reader',role:'reader'}));const entries=await lib.todos();return await(await lib.pegar(entries[0].id)).blob.text();}""")
 assert result=='Conteudo enviado diretamente.'
 u.set_viewport_size({'width':390,'height':844})
 assert u.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('Simulated RTC transport (network blocked by environment): local offer, request, admin approval, direct transfer and recipient IndexedDB import PASS');b.close()
