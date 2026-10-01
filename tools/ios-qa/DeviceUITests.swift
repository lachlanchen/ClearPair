import XCTest

// Independent UI controller for the installed TestFlight copies. It never
// installs an application under test, injects its data, or changes pairing.
final class DeviceUITests: XCTestCase {
    struct Step: Decodable {
        let action: String
        let bundle: String?
        let label: String?
        let seconds: Double?
    }
    let courses = Set(["handf", "landr", "english", "chinese", "korean", "arabic", "cantonese"].map { "art.lazying.clearpair.\($0)" })
    @MainActor func testObservedSequence() throws {
        continueAfterFailure = false
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["CLEARPAIR_DEVICE_STEPS"])
        let steps = try JSONDecoder().decode([Step].self, from: Data(raw.utf8))
        XCTAssertTrue((1...40).contains(steps.count))
        var app: XCUIApplication?
        var bundle: String?
        for (index, step) in steps.enumerated() {
            print("CLEARPAIR_DEVICE_STEP \(index + 1) \(step.action)")
            switch step.action {
            case "activate":
                let id = try XCTUnwrap(step.bundle)
                XCTAssertTrue(courses.contains(id) || id == "com.apple.TestFlight")
                let target = XCUIApplication(bundleIdentifier: id)
                target.activate(); XCTAssertTrue(target.wait(for: .runningForeground, timeout: 20))
                app = target; bundle = id
            case "inspect":
                let target = try XCTUnwrap(app)
                print("CLEARPAIR_HIERARCHY_BEGIN\n\(target.debugDescription)\nCLEARPAIR_HIERARCHY_END")
                let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                image.name = "ClearPair-\(index + 1)"; image.lifetime = .keepAlways; add(image)
            case "inspectSystem":
                print("CLEARPAIR_SYSTEM_BEGIN\n\(XCUIApplication(bundleIdentifier: "com.apple.springboard").debugDescription)\nCLEARPAIR_SYSTEM_END")
                let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                image.name = "System-\(index + 1)"; image.lifetime = .keepAlways; add(image)
            case "tap":
                let target = try XCTUnwrap(app), label = try XCTUnwrap(step.label)
                let matches = target.buttons.matching(NSPredicate(format: "identifier == %@ OR label == %@", label, label))
                XCTAssertTrue(matches.firstMatch.waitForExistence(timeout: 10), "Missing observed button: \(label)")
                let visible = matches.allElementsBoundByIndex.filter { $0.isHittable }
                let chosen = try XCTUnwrap(visible.last)
                XCTAssertTrue(chosen.isEnabled)
                XCTAssertTrue(visible.allSatisfy { $0.frame == chosen.frame }, "Ambiguous hit regions")
                chosen.tap()
            case "waitText":
                let target = try XCTUnwrap(app), label = try XCTUnwrap(step.label)
                XCTAssertTrue(target.staticTexts[label].waitForExistence(timeout: 15))
            case "pause":
                let seconds = try XCTUnwrap(step.seconds)
                XCTAssertTrue(seconds.isFinite && (0...15).contains(seconds))
                Thread.sleep(forTimeInterval: seconds)
            case "terminate":
                XCTAssertTrue(courses.contains(try XCTUnwrap(bundle)))
                try XCTUnwrap(app).terminate()
            case "home": XCUIDevice.shared.press(.home)
            default: XCTFail("Unsupported action; no generic prompt/pairing/settings approval")
            }
        }
    }
}
