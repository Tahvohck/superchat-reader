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
            throw new Error("TestConfig Validation failed")
        }
    }
}

function removeTestFileIfPossible(){
    try {
        Deno.removeSync(testFileLocation)
    } catch {
        // This fails if the file isn't there, so it's fine. We want there to not be a file.
    }
}

// Test Setup
const defaultConfigPath = SavedConfig.configPath;
SavedConfig.configPath = join(Deno.cwd(), 'test-output')
const testFileLocation = join(SavedConfig.configPath, new TestConfig()[SAVE_PATH])

const testPrefix = "SavedConfig:"
Deno.test(`${testPrefix} File saving (standalone)`, ()=> {
    removeTestFileIfPossible()
    const config = new TestConfig();
    config.save()
    // confirm the file exists
    Deno.lstatSync(testFileLocation)
})

Deno.test(`${testPrefix} File automatic creation`, async ()=> {
    removeTestFileIfPossible()
    await TestConfig.getOrCreate(TestConfig)
    // confirm the file exists
    Deno.lstatSync(testFileLocation)
})

Deno.test(`${testPrefix} Loading saved value`, async () => {
    removeTestFileIfPossible()
    let config = new TestConfig()
    config.max = 400
    config.save()
    config = await SavedConfig.getOrCreate(TestConfig)
    assertEquals(config.max, 400)
})

Deno.test(`${testPrefix} Validation failure during set`, async () => {
    const config = await SavedConfig.getOrCreate(TestConfig)
    assertThrows(() => {
        config.max = config.min - 1  
    })
})

Deno.test(`${testPrefix} Validation failure during load`, async () => {
    // Bypass the validation step during setup
    class BadConfig extends TestConfig {
        override validate(): void {}
    }
    const badConfig = new BadConfig()
    badConfig.max = 0
    badConfig.min = 1
    badConfig.save()

    // Now load it as the base class that validates
    await assertRejects(() => {
        return SavedConfig.getOrCreate(TestConfig)
    })
})


Deno.test(`${testPrefix} Teardown`, () => {
    Deno.removeSync(SavedConfig.configPath, {recursive: true})
    SavedConfig.configPath = defaultConfigPath
})