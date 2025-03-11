import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';
import UISnippets from '@app/UISnippets/dir.ts';
import { FileHandler } from '@app/FileHandler.ts';
import { sleep } from '@app/util.ts';
const win = new WebUI();
const fh = new FileHandler();
const cb = new ConfigurationBuilder();

if (import.meta.main) {
    setUpFH();
    setUpCB();

    cb.bind(win);
    win.setPort(8080);
    win.setSize(400, 600);
    win.setFileHandler(fh.handler);

    // We don't care about errors
    await win.show('embed/cb-panel-sample.html').catch(() => {});
    await waitForbridge(win);
    await win.script(`replace('${cb.render()}')`);

    await WebUI.wait();
    console.log('exit program');
    Deno.exit();
}

async function waitForbridge(win: WebUI) {
    let ready = false;
    win.bind('ready', () => {
        ready = true;
    });
    while (!ready) {
        await sleep(25);
    }
}

function setUpCB() {
    cb
        .addButton('click here to boop', {})
        .addButton('Click to exit', {
            callback: () => {
                win.close();
            },
        })
        .addCheckbox('check: Starts checked', { value: true })
        .addCheckbox('check: Starts unchecked', {})
        .addSlider('slider', {
            range: [2, 20],
            value: 6,
            step: 2,
        })
        .addTextBox('Textbox: blank', { type: 'text' })
        .addTextBox('Textbox: filled', { type: 'text', value: 'pre-filled' })
        .addTextBox('Textbox: placeholder', { type: 'text', placeholder: 'Enter text here' })
        .addTextBox('Numberbox: blank', { type: 'number' })
        .addTextBox('Numberbox: filled', { type: 'number', value: 1234 })
        .addTextBox('Numberbox: placeholder', { type: 'number', placeholder: 'Enter text here' });
}

function setUpFH() {
    fh.router
        .add('embed/', async (_v, _p, filePath) => {
            filePath = filePath.slice(1);
            const data = await UISnippets.get(filePath);
            if (data) {
                const ext = filePath.split('.').at(-1);
                return new Response(await data.text(), {
                    headers: new Headers({
                        'Content-Type': `text/${ext}`,
                    }),
                });
            } else {
                return new Response(null, {
                    status: 404,
                    statusText: filePath + ' not a valid embedded file',
                });
            }
        }, true)
        .add('/favicon.ico', async () => {
            return await fetch(`http://localhost:8080/favicon.ico`);
        })
        .add('/webui.js', async () => {
            return await fetch(`http://localhost:8080/webui.js`);
        });
}
