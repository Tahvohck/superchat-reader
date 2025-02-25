import { SAVE_PATH, SavedConfig } from '@app/SavedConfig.ts';
import { join } from '@std/path';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';

// Config to use for this test
class TestConfig extends SavedConfig {
    [SAVE_PATH] = "TestConfig.json"
    max = 25
    min = 5

    override validate(): void {
        if (this.max <= this.min) {
            throw new Error()
        }
    }
}

// Test Setup
const defaultConfigPath = SavedConfig.configPath;
SavedConfig.configPath = join(Deno.cwd(), 'test-output')
const testFileLocation = join(SavedConfig.configPath, new TestConfig()[SAVE_PATH])
try {
    Deno.removeSync(testFileLocation)
} catch {
    // failing to remove the file is fine (it might not exist yet)
}

const testPrefix = "SavedConfig:"
Deno.test(`${testPrefix} File saving (standalone)`, ()=> {
    const config = new TestConfig();
    config.save()
    // confirm the file exists
    Deno.lstatSync(testFileLocation)
})

Deno.test(`${testPrefix} File automatic creation`, async ()=> {
    try {
        Deno.removeSync(testFileLocation)
    } catch {
        // This fails if the file isn't there, so it's fine. We want there to not be a file.
        // This could fail if only this test is run instead of the whole file
    }
    await TestConfig.load(TestConfig)
    // confirm the file exists
    Deno.lstatSync(testFileLocation)
})

Deno.test(`${testPrefix} Loading saved value`, async () => {
    let config = new TestConfig()
    config.max = 400
    config = await TestConfig.load(TestConfig)
    assertEquals(config.max, 400)
})

Deno.test(`${testPrefix} Saved value not overwritten by constructor`, async () => {
    let config = new TestConfig()
    config.max = 400
    config = new TestConfig()
    config = await TestConfig.load(TestConfig)
    assertEquals(config.max, 400)
})

Deno.test(`${testPrefix} Validation failure during set`, () => {
    // No need to do a proper load for this, we're only testing the proxy.
    const config = new TestConfig()
    assertThrows(() => {
        config.max = config.min - 1  
    })
})

Deno.test(`${testPrefix} Validation failure during load`, async () => {
    // Bypass the validation step during setup
    class BadConfig extends TestConfig {
        override validate(): void {}
    }
    const badConfig = await BadConfig.load(BadConfig)
    badConfig.max = 0
    badConfig.min = 1

    // Now load it as the base class that validates
    await assertRejects(async () => {
        await TestConfig.load(TestConfig)
    })
})


Deno.test(`${testPrefix} Teardown`, () => {
    Deno.removeSync(SavedConfig.configPath, {recursive: true})
    SavedConfig.configPath = defaultConfigPath
})