"""Touch navigation must distinguish swipes from pinch, pan, taps and cancellation."""
from pathlib import Path
import io,zipfile,base64
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
archive=io.BytesIO()
with zipfile.ZipFile(archive,'w') as z:
    for n in range(3):z.writestr(f'{n}.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844},is_mobile=True,has_touch=True);connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.locator('#localHQInput').set_input_files({'name':'Gestos.cbz','mimeType':'application/zip','buffer':archive.getvalue()})
    page.wait_for_selector('[data-device-library] [data-ler]');page.locator('[data-device-library] [data-ler]').first.click()
    page.wait_for_selector('#leitorHQ.aberto');page.locator('#hqModo').select_option('pagina')
    def current(n):assert page.locator('#hqContador').inner_text()==f'{n} / 3'
    def touch(kind,active,changed):
        page.evaluate('''({kind,active,changed})=>{const target=document.querySelector('#hqPalco');
        const make=p=>new Touch({identifier:p[0],target,clientX:p[1],clientY:p[2]});
        target.dispatchEvent(new TouchEvent(kind,{bubbles:true,touches:active.map(make),changedTouches:changed.map(make)}));}''',{'kind':kind,'active':active,'changed':changed})
    def swipe(start,end):
        touch('touchstart',[[1,*start]],[[1,*start]]);touch('touchmove',[[1,*end]],[[1,*end]]);touch('touchend',[],[[1,*end]])
    current(1)
    page.touchscreen.tap(350,400);current(1)
    page.touchscreen.tap(350,400);current(1)
    # Two fingers, then release separately: neither release may turn a page.
    touch('touchstart',[[1,100,400]],[[1,100,400]])
    touch('touchstart',[[1,100,400],[2,250,400]],[[2,250,400]])
    touch('touchmove',[[1,20,400],[2,350,400]],[[1,20,400],[2,350,400]])
    touch('touchend',[[1,20,400]],[[2,350,400]]);touch('touchend',[],[[1,20,400]]);current(1)
    swipe((300,300),(180,550));current(1) # vertical movement
    touch('touchstart',[[1,300,400]],[[1,300,400]]);touch('touchcancel',[],[[1,50,400]])
    touch('touchend',[],[[1,50,400]]);current(1)
    swipe((300,400),(50,400));current(2)
    page.locator('#hqPalco').dispatch_event('click',{'clientX':350,'clientY':400});current(2) # synthesized click
    page.keyboard.press('+');swipe((300,400),(50,400));current(2)
    page.keyboard.press('-')
    cdp=ctx.new_cdp_session(page);cdp.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2})
    assert page.evaluate('visualViewport.scale')>1.05
    swipe((300,400),(50,400));current(2)
    cdp.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})
    page.keyboard.press('r');swipe((300,400),(50,400));current(1)
    page.keyboard.press('r');page.locator('#hqProx').click();current(2)
    page.wait_for_timeout(1100)
    page.mouse.click(350,400);current(3) # desktop mouse remains functional
    assert not errors,errors
    print('Mobile HQ: taps, pinch, native/app zoom pan, vertical/cancelled gestures, single swipe, ghost click, RTL and explicit/mouse navigation: PASS')
    browser.close()
