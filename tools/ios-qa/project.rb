# Generate only an ignored, test-only host and XCTest runner. Never edits app projects.
require 'xcodeproj'
require 'fileutils'
require 'pathname'
root = File.expand_path('../..', __dir__)
device_control = ARGV.include?('--device-control')
out = File.join(root, device_control ? '.runtime/ios/device-qa' : '.runtime/ios/qa')
FileUtils.mkdir_p(out)
project = Xcodeproj::Project.new(File.join(out, 'ClearPairQA.xcodeproj'))
host = project.new_target(:application, 'ClearPairQAHost', :ios, '15.0')
tests = project.new_target(:ui_test_bundle, 'ClearPairUITests', :ios, '15.0')
source = ->(name) { Pathname.new(File.join(root, 'tools/ios-qa', name)).relative_path_from(Pathname.new(out)).to_s }
host.add_file_references([project.main_group.new_file(source.call('Host.swift'))])
tests.add_file_references([project.main_group.new_file(source.call(device_control ? 'DeviceUITests.swift' : 'FamilyUITests.swift'))])
tests.add_dependency(host)
[host, tests].each do |target|
  target.build_configurations.each do |c|
    c.build_settings['SWIFT_VERSION'] = '5.0'
    c.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
    c.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
    c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'art.lazying.clearpair.qa.' + target.name.downcase
    c.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  end
end
tests.build_configurations.each { |c| c.build_settings['TEST_TARGET_NAME'] = host.name }
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host)
scheme.add_test_target(tests)
scheme.set_launch_target(host)
scheme.save_as(project.path, 'ClearPairQA', true)
puts project.path
