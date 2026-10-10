// Build an opaque native iOS 1024x1024 AppIcon from the approved LOC emblem.
// CoreGraphics uses RGBX (alphaInfo.noneSkipLast), not an alpha-enabled bitmap.
import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import Foundation

guard CommandLine.arguments.count == 3 else {
  fatalError("Usage: swift prepare-ios-app-icon.swift <emblem PNG> <AppIcon PNG>")
}
let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let emblem = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fatalError("Cannot read canonical LOC lunar emblem")
}
let side = 1024
let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.noneSkipLast.rawValue
guard let canvas = CGContext(
  data: nil, width: side, height: side,
  bitsPerComponent: 8, bytesPerRow: 0,
  space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: bitmapInfo
) else {
  fatalError("Cannot allocate opaque RGBX CoreGraphics canvas")
}
canvas.setFillColor(CGColor(red: 7.0/255.0, green: 24.0/255.0, blue: 45.0/255.0, alpha: 1))
canvas.fill(CGRect(x: 0, y: 0, width: side, height: side))
canvas.interpolationQuality = .high
let inset: CGFloat = 62
canvas.draw(emblem, in: CGRect(x: inset, y: inset, width: CGFloat(side) - 2*inset, height: CGFloat(side) - 2*inset))
guard let image = canvas.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
  fatalError("Cannot create AppIcon PNG destination")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else {
  fatalError("Cannot write AppIcon PNG")
}
print("Native LOC AppIcon ready: 1024x1024 opaque RGBX, output: \(outputURL.path)")
