import XCTest

/// Isolated simulator QA app only; no production app, microphone or shared UI.
final class SpeechUITests: XCTestCase {
    @MainActor func testObserveOrApproveOwnedSpeechAlert() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "art.lazying.clearpair.qa.modelios")
        app.activate()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        _ = system.alerts.firstMatch.waitForExistence(timeout: 5)
        print("CLEARPAIR_SPEECH_SYSTEM_BEGIN\n\(system.debugDescription)\nCLEARPAIR_SPEECH_SYSTEM_END")
        let before = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        before.name = "Speech-before"; before.lifetime = .keepAlways; add(before)
        guard let label = ProcessInfo.processInfo.environment["CLEARPAIR_SPEECH_ALERT"],
              let button = ProcessInfo.processInfo.environment["CLEARPAIR_SPEECH_BUTTON"] else { return }
        XCTAssertTrue(label.contains("ClearPair Offline QA") && label.lowercased().contains("speech"))
        XCTAssertTrue(["Allow", "OK"].contains(button))
        let alerts = system.alerts.matching(identifier: label)
        XCTAssertEqual(alerts.count, 1, "Only the observed exact QA speech permission is in scope")
        let choices = alerts.element.buttons.matching(identifier: button)
        XCTAssertEqual(choices.count, 1)
        XCTAssertTrue(choices.element.isHittable && choices.element.isEnabled)
        choices.element.tap()
        let after = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        after.name = "Speech-after"; after.lifetime = .keepAlways; add(after)
    }
}
