import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { assert, assertEquals } from '@std/assert';
import { DOMParser } from 'jsr:@b-fuze/deno-dom';

Deno.test({
    name: 'ConfigBuild: Clean test',
    fn: async (context) => {
        const uuidRegex = /[a-f0-9]{8}(_[a-f0-9]{4}){3}_[a-f0-9]{12}/;
        const configButton = {};
        const configCheckbox = {
            value: false,
        };
        const configSlider = {
            range: [3, 69] as [number, number],
            step: 2,
            value: 42,
        };
        const configTextbox = {
            type: 'text',
            value: 'Text here',
            placeholder: 'Textbox',
        };
        const configNumberbox = {
            type: 'number',
            value: 12,
            placeholder: 'Numberbox',
        };
        const cb = new ConfigurationBuilder()
            .addButton('Button', configButton)
            .addCheckbox('checkbox', configCheckbox)
            .addSlider('slider', configSlider)
            // @ts-expect-error Not gonna export the type jsut to avoid an error here
            .addTextBox('textbox', configTextbox)
            // @ts-expect-error Not gonna export the type jsut to avoid an error here
            .addTextBox('numberbox', configNumberbox);
        const doc = new DOMParser().parseFromString(cb.render(), 'text/html');
        const elemButton = doc.querySelector('config-button')!;
        const elemSlider = doc.querySelector('config-slider')!;
        const elemCheckbox = doc.querySelector('config-checkbox')!;
        const elemTextbox = doc.querySelectorAll('config-textbox')[0]!;
        const elemNumberbox = doc.querySelectorAll('config-textbox')[1]!;
        const elems = [elemButton, elemSlider, elemCheckbox, elemTextbox, elemNumberbox];
        for (const elem of elems) {
            assert(null !== elem, "One of the elements wasn't created");
        }

        await context.step({
            name: 'All elements have UUIDs and labels',
            fn: () => {
                for (const elem of elems) {
                    assert(uuidRegex.test(elem?.getAttribute('uuid') ?? ''));
                    assert(elem.hasAttribute('label'));
                }
            },
        });

        await context.step({
            name: 'Slider contains all parts',
            fn: () => {
                const { step, value, ['range']: [min, max] } = configSlider;
                assertEquals(elemSlider.getAttribute('min'), String(min));
                assertEquals(elemSlider.getAttribute('max'), String(max));
                assertEquals(elemSlider.getAttribute('step'), String(step));
                assertEquals(elemSlider.getAttribute('value'), String(value));
            },
        });

        await context.step({
            name: 'Checkbox contains all parts',
            fn: () => {
                assertEquals(elemCheckbox.getAttribute('value'), String(configCheckbox.value));
            },
        });

        await context.step({
            name: 'Textbox contains all parts',
            fn: () => {
                assertEquals(elemTextbox.getAttribute('value'), String(configTextbox.value));
                assertEquals(elemTextbox.getAttribute('type'), String(configTextbox.type));
                assertEquals(elemTextbox.getAttribute('placeholder'), String(configTextbox.placeholder));
            },
        });

        await context.step({
            name: 'Numberbox contains all parts',
            fn: () => {
                assertEquals(elemTextbox.getAttribute('value'), String(configTextbox.value));
                assertEquals(elemTextbox.getAttribute('type'), String(configTextbox.type));
                assertEquals(elemTextbox.getAttribute('placeholder'), String(configTextbox.placeholder));
            },
        });
    },
});

Deno.test({
    name: 'ConfigBuild: No options passed',
    fn: (_context) => {
        const cb = new ConfigurationBuilder()
            .addButton('Button', {})
            .addCheckbox('checkbox', {})
            .addSlider('slider', {})
            .addTextBox('textbox', {})
            .addTextBox('numberbox', {});
        cb.render();
    },
});
