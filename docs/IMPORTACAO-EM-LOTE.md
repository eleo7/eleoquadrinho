# Importação de vários pacotes

Em **Biblioteca → Neste dispositivo → Transferir HQs**, use **Importar pacotes de HQs** e selecione vários arquivos `.eleohq` de uma vez. No celular, use a seleção múltipla do gerenciador de arquivos, quando disponível.

Os pacotes são conferidos e gravados um por vez. A tela mostra o arquivo atual e, ao terminar, o resultado de cada pacote. HQs repetidas são ignoradas pelo hash; um pacote inválido não impede a importação dos próximos. O limite continua sendo 500 MB de conteúdo por pacote, sujeito ao espaço disponível no navegador.

**Cancelar fila** interrompe os próximos pacotes. Uma gravação já iniciada termina de forma atômica; pacotes concluídos são preservados. Falta de espaço interrompe a fila e informa os pacotes restantes.

A importação adiciona apenas HQs locais. Não substitui perfil, histórico, favoritos ou catálogo compartilhado. A opção de importar uma pasta descompactada ou selecionar seu `manifest.json` e arquivos continua disponível.
