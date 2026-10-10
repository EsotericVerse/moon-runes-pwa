// Draw the approved LOC lunar emblem on an opaque iOS App Icon canvas.
// AppIcon is native-only; web favicon and author/LunaRunes art are independent.
import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
  fatalError("Usage: swift prepare-ios-app-icon.swift <LOC emblem PNG> <AppIcon output PNG>")
}
let source = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
guard let emblem = NSImage(contentsOfFile: source) else {
  fatalError("Cannot open canonical LOC emblem at \(source)")
}
let size = 1024
guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: size,
  pixelsHigh: size,
  bitsPerSample: 8,
  samplesPerPixel: 3,
  hasAlpha: false,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fatalError("Cannot allocate opaque 1024x1024 AppIcon canvas")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
NSColor(srgbRed: 7.0 / 255.0, green: 24.0 / 255.0, blue: 45.0 / 255.0, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: CGFloat(size), height: CGFloat(size))).fill()
// The art is 64px favicon source from the approved LOC Scope identity.
// Keep its outer observation dot visible; the OS supplies rounded corners.
let inset: CGFloat = 62.0
emblem.draw(
  in: NSRect(x: inset, y: inset, width: CGFloat(size) - 2 * inset, height: CGFloat(size) - 2 * inset),
  from: .zero,
  operation: .sourceOver,
  fraction: 1
)
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
guard let data = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Cannot render native AppIcon PNG")
}
try data.write(to: URL(fileURLWithPath: output), options: .atomic)
print("Native LOC AppIcon ready: 1024x1024 RGB (opaque) at \(output)")
