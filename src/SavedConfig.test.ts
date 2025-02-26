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
Deno.test(`${testPrefix} File saving (manual)`, ()=> {
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

interface serviceInterface {
    John: number
    Shiki: string
    Eats: Error
}

class serviceClass {
    returnTrue = () => true
}

class ComplicatedConfig extends SavedConfig {
    [SAVE_PATH] = "complicated.json"
    recordholder: Record<string, number> = {
        "foo": 1,
        "bar": 2
    }
    map: Map<number, string> = new Map<number, string>()
    service: serviceInterface = {
        John: 1,
        Shiki: "oshi",
        Eats: new Deno.errors.Busy("Eating burgers")
    }
    nested: Record<string, Record<string, Record<string, number>> | string[]> = {
        one: {
            two: {
                three: 4
            }
        },
        five: ["six", "seven", "eight"]
    }
    complexType = new serviceClass()
}

Deno.test({
    name: `${testPrefix} Complicated Config`,
    // This test currently doesn't work. Deeper proxying or some other solution will be needed.
    ignore: true,
    fn: async () => {
        let config = await SavedConfig.getOrCreate(ComplicatedConfig);
        (config.nested["one"] as Record<string, Record<string, number>>)["two"]["three"] = 9
        config.recordholder["baz"] = 3
        config = await SavedConfig.getOrCreate(ComplicatedConfig);

        try {
            config.complexType.returnTrue()
        } catch {
            throw new Error("Failure to rehydrate type")
        }
        assertEquals(
            config.recordholder["baz"],
            3, "Shallow nesting failure"
        )
        assertEquals(
            (config.nested["one"] as Record<string, Record<string, number>>)["two"]["three"],
            9,
            "Deep nesting failure"
        )
    }
})


Deno.test(`${testPrefix} Teardown`, () => {
    Deno.removeSync(SavedConfig.configPath, {recursive: true})
    SavedConfig.configPath = defaultConfigPath
})