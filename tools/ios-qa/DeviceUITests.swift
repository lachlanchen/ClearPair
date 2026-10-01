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
    let courses = Set(["handf", "landr", "english", "chinese", "korean", "arabic", "cantonese", "japanese"].map { "art.lazying.clearpair.\($0)" })
    let names = ["handf":"ClearPair H & F", "landr":"ClearPair L & R", "english":"ClearPair English", "chinese":"ClearPair Mandarin", "korean":"ClearPair Korean", "arabic":"ClearPair Arabic Letters", "cantonese":"ClearPair Cantonese", "japanese":"ClearPair Japanese"]
    @MainActor func testObservedSequence() throws {
        continueAfterFailure = false
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["CLEARPAIR_DEVICE_STEPS"])
        let steps = try JSONDecoder().decode([Step].self, from: Data(raw.utf8))
        XCTAssertTrue((1...40).contains(steps.count))
        var app: XCUIApplication?
        var bundle: String?
        var recordFrame: CGRect?
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
            case "selectCourseInTestFlight":
                XCTAssertEqual(bundle, "com.apple.TestFlight")
                let target = try XCTUnwrap(app), course = try XCTUnwrap(step.bundle)
                XCTAssertTrue(courses.contains(course))
                let name = try XCTUnwrap(names[String(course.split(separator: ".").last!)])
                let cells = target.cells.containing(.staticText, identifier: name)
                XCTAssertEqual(cells.count, 1, "Only an observed exact ClearPair row is in scope")
                XCTAssertTrue(cells.element.isHittable)
                cells.element.tap()
            case "approveMicrophone":
                let id = try XCTUnwrap(bundle)
                XCTAssertTrue(courses.contains(id))
                let name = try XCTUnwrap(names[String(id.split(separator: ".").last!)])
                let expected = "“\(name)” would like to access the Microphone."
                let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
                let alert = system.alerts[expected]
                XCTAssertTrue(alert.waitForExistence(timeout: 10), "Only this app's observed microphone permission is in scope")
                let allow = alert.buttons["Allow"]
                XCTAssertTrue(allow.exists && allow.isHittable && allow.isEnabled)
                allow.tap()
            case "continueBetaIntroIfPresent":
                let id = try XCTUnwrap(bundle)
                XCTAssertTrue(courses.contains(id))
                let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
                for title in ["From the Developer", "Share Feedback"] {
                    if system.staticTexts[title].exists {
                        XCTAssertTrue(system.otherElements["card:\(id):sceneID:\(id)-default"].exists)
                        let buttons = system.buttons.matching(identifier: "Continue").allElementsBoundByIndex.filter { $0.isHittable }
                        let chosen = try XCTUnwrap(buttons.last)
                        XCTAssertTrue(chosen.isEnabled && buttons.allSatisfy { $0.frame == chosen.frame })
                        chosen.tap()
                    }
                }
            case "startRecording":
                let target = try XCTUnwrap(app), id = try XCTUnwrap(bundle)
                XCTAssertTrue(courses.contains(id))
                let record = target.buttons["Record your voice"]
                XCTAssertTrue(record.waitForExistence(timeout: 10) && record.isHittable && record.isEnabled)
                recordFrame = record.frame
                record.tap()
                let name = try XCTUnwrap(names[String(id.split(separator: ".").last!)])
                let alert = XCUIApplication(bundleIdentifier: "com.apple.springboard").alerts["“\(name)” would like to access the Microphone."]
                if alert.waitForExistence(timeout: 1) {
                    let allow = alert.buttons["Allow"]
                    XCTAssertTrue(allow.exists && allow.isHittable && allow.isEnabled)
                    allow.tap()
                    // The app deliberately cancels a pending take on backgrounding.
                    // A permission dialog may do this; start one fresh foreground take.
                    let finish = target.buttons["Finish recording"]
                    for _ in 0..<15 {
                        if finish.exists { break }
                        if record.exists && record.isEnabled { recordFrame = record.frame; record.tap(); break }
                        Thread.sleep(forTimeInterval: 0.2)
                    }
                }
                XCTAssertTrue(target.buttons["Finish recording"].waitForExistence(timeout: 10))
                print("CLEARPAIR_CAPTURE_READY \(id)")
            case "finishRecording":
                let target = try XCTUnwrap(app), before = try XCTUnwrap(recordFrame)
                let finish = target.buttons["Finish recording"]
                XCTAssertTrue(finish.exists && finish.isHittable && finish.isEnabled)
                XCTAssertEqual(finish.frame.minY, before.minY, accuracy: 2)
                finish.tap()
                XCTAssertTrue(target.staticTexts["Saved on device"].waitForExistence(timeout: 15))
                let after = target.buttons["Record your voice"]
                XCTAssertTrue(after.exists && after.isEnabled)
                XCTAssertEqual(after.frame.minY, before.minY, accuracy: 2)
            case "replayHistoryTwo":
                let target = try XCTUnwrap(app)
                XCTAssertTrue(courses.contains(try XCTUnwrap(bundle)))
                for index in 0..<2 {
                    let rows = target.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Play recording ")).allElementsBoundByIndex.filter { $0.isHittable }.sorted { $0.frame.minY < $1.frame.minY }
                    XCTAssertGreaterThanOrEqual(rows.count, 2)
                    XCTAssertNotEqual(rows[0].frame, rows[1].frame)
                    XCTAssertTrue(rows[index].isEnabled)
                    rows[index].tap()
                    Thread.sleep(forTimeInterval: 9)
                    XCTAssertTrue(target.staticTexts["Ready when you are"].waitForExistence(timeout: 10))
                }
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
            case "swipe":
                let target = try XCTUnwrap(app), direction = try XCTUnwrap(step.label)
                XCTAssertTrue(courses.contains(try XCTUnwrap(bundle)))
                switch direction {
                case "up": target.swipeUp()
                case "down": target.swipeDown()
                default: XCTFail("Only bounded app-local up/down scrolling is supported")
                }
            case "terminate":
                XCTAssertTrue(courses.contains(try XCTUnwrap(bundle)))
                try XCTUnwrap(app).terminate()
            case "home": XCUIDevice.shared.press(.home)
            default: XCTFail("Unsupported action; no generic prompt/pairing/settings approval")
            }
        }
    }
}
