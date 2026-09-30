import XCTest

final class FamilyUITests: XCTestCase {
    func testSevenNativeApps() throws {
        continueAfterFailure = false
        for id in ["handf", "landr", "english", "chinese", "korean", "arabic", "cantonese"] {
            let app = XCUIApplication(bundleIdentifier: "art.lazying.clearpair.\(id)")
            app.launch()
            defer { app.terminate() }
            XCTAssertTrue(app.buttons["Practise"].waitForExistence(timeout: 25), app.debugDescription)
            app.buttons["Practise"].tap()
            let record = app.buttons["Record your voice"]
            XCTAssertTrue(record.waitForExistence(timeout: 10))
            let original = record.frame
            for _ in 0..<2 {
                record.tap()
                let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
                let allow = springboard.buttons["Allow"]
                if allow.waitForExistence(timeout: 3) { allow.tap() }
                let okay = springboard.buttons["OK"]
                if okay.exists { okay.tap() }
                XCTAssertTrue(app.buttons["Finish recording"].waitForExistence(timeout: 15), app.debugDescription)
                Thread.sleep(forTimeInterval: 2)
                app.buttons["Finish recording"].tap()
                XCTAssertTrue(app.staticTexts["Saved on device"].waitForExistence(timeout: 15), app.debugDescription)
                XCTAssertTrue(app.buttons["My recording"].isEnabled)
                XCTAssertEqual(record.frame.minY, original.minY, accuracy: 2)
            }
            shot(id + "-native-recorded")
            app.buttons["My recording"].tap()
            Thread.sleep(forTimeInterval: 3)
            app.buttons["Hear the pair"].tap()
            Thread.sleep(forTimeInterval: 5)
            app.buttons["Hear the pair"].tap()
            Thread.sleep(forTimeInterval: 5)
            app.buttons["History"].tap()
            shot(id + "-history")
            app.terminate(); app.launch()
            XCTAssertTrue(app.buttons["History"].waitForExistence(timeout: 20))
            app.buttons["History"].tap()
            XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Play recording ")).firstMatch.waitForExistence(timeout: 10), app.debugDescription)
            shot(id + "-persisted")
            app.terminate()
        }
    }
    private func shot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
