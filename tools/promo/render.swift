import AppKit
import AVFoundation
import CoreText
import ImageIO

struct Beat: Decodable {
    let start: Double
    let end: Double
    let lines: [String]
    let color: String
    let tag: String
}
struct Scenario: Decodable {
    let title: String
    let duration: Double
    let fps: Int
    let size: Size
    let beats: [Beat]
    struct Size: Decodable { let width: Int; let height: Int }
}

let args = CommandLine.arguments
guard args.count == 6 else { fatalError("usage: render.swift WORLD.png HERO.png AUDIO.wav SCENARIO.json OUTPUT_DIR") }
let worldURL = URL(fileURLWithPath: args[1])
let heroURL = URL(fileURLWithPath: args[2])
let audioURL = URL(fileURLWithPath: args[3])
let scenarioURL = URL(fileURLWithPath: args[4])
let outputDir = URL(fileURLWithPath: args[5], isDirectory: true)
let scenario = try JSONDecoder().decode(Scenario.self, from: Data(contentsOf: scenarioURL))
let width = scenario.size.width, height = scenario.size.height, fps = scenario.fps
let frames = Int(scenario.duration * Double(fps))
let coverURL = outputDir.appendingPathComponent("tsutawatari-promo-cover.jpg")
let framesDir = outputDir.appendingPathComponent("frames", isDirectory: true)
let world = NSImage(contentsOf: worldURL)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let hero = NSImage(contentsOf: heroURL)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!

func rgb(_ hex: String, _ alpha: CGFloat = 1) -> CGColor {
    let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    let n = Int(s, radix: 16) ?? 0xffffff
    return CGColor(red: CGFloat((n >> 16) & 255) / 255, green: CGFloat((n >> 8) & 255) / 255,
                   blue: CGFloat(n & 255) / 255, alpha: alpha)
}
func rounded(_ c: CGContext, _ rect: CGRect, _ radius: CGFloat, _ color: CGColor, stroke: CGColor? = nil, line: CGFloat = 1) {
    let p = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    c.addPath(p); c.setFillColor(color); c.fillPath()
    if let stroke { c.addPath(p); c.setStrokeColor(stroke); c.setLineWidth(line); c.strokePath() }
}
func textWidth(_ string: String, size: CGFloat) -> CGFloat {
    let font = CTFontCreateWithName("HiraginoSans-W8" as CFString, size, nil)
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
    return CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
}
func drawText(_ c: CGContext, _ string: String, center x: CGFloat, top y: CGFloat, size initial: CGFloat,
              color: CGColor, outline: CGColor = rgb("#163337"), maxWidth: CGFloat = 900, stroke: CGFloat? = nil) {
    var size = initial
    while textWidth(string, size: size) > maxWidth && size > 20 { size -= 2 }
    let font = CTFontCreateWithName("HiraginoSans-W8" as CFString, size, nil)
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
    let bounds = CTLineGetBoundsWithOptions(line, [])
    let originX = x - CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil)) / 2
    c.saveGState()
    c.translateBy(x: originX, y: y + size * 0.90)
    c.scaleBy(x: 1, y: -1)
    c.setTextDrawingMode(.stroke)
    c.setLineJoin(.round); c.setLineCap(.round); c.setLineWidth(stroke ?? max(7, size * 0.12))
    c.setStrokeColor(outline); CTLineDraw(line, c)
    c.setTextDrawingMode(.fill); c.setFillColor(color); CTLineDraw(line, c)
    c.restoreGState()
    _ = bounds
}
func drawImage(_ c: CGContext, _ image: CGImage, in rect: CGRect, angle: CGFloat = 0, alpha: CGFloat = 1) {
    c.saveGState(); c.setAlpha(alpha); c.translateBy(x: rect.midX, y: rect.midY); c.rotate(by: angle)
    c.draw(image, in: CGRect(x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height))
    c.restoreGState()
}
func line(_ c: CGContext, _ pts: [CGPoint], color: CGColor, width: CGFloat, cap: CGLineCap = .round) {
    guard let p = pts.first else { return }
    c.beginPath(); c.move(to: p); for point in pts.dropFirst() { c.addLine(to: point) }
    c.setStrokeColor(color); c.setLineWidth(width); c.setLineCap(cap); c.strokePath()
}
func gradient(_ c: CGContext, _ rect: CGRect, _ colors: [CGColor], start: CGPoint, end: CGPoint) {
    let cs = CGColorSpaceCreateDeviceRGB()
    let g = CGGradient(colorsSpace: cs, colors: colors as CFArray, locations: nil)!
    c.saveGState(); c.clip(to: rect); c.drawLinearGradient(g, start: start, end: end, options: []); c.restoreGState()
}
func beat(at time: Double) -> Beat { scenario.beats.first(where: { time >= $0.start && time < $0.end }) ?? scenario.beats.last! }
func sceneIndex(_ time: Double) -> Int { min(5, max(0, Int(max(0, time - 10) / 2.75))) }

func drawScene(_ c: CGContext, time t: Double, cover: Bool = false) {
    let w = CGFloat(width), h = CGFloat(height)
    let progress = t / scenario.duration
    let cameraZoom = 1.025 + CGFloat((sin(t * 0.7) + 1) * 0.009)
    let artH = h * cameraZoom, artW = max(w, artH * CGFloat(world.width) / CGFloat(world.height))
    let artX = (w - artW) / 2 + sin(t * 0.19) * 10
    c.draw(world, in: CGRect(x: artX, y: (h - artH) / 2, width: artW, height: artH))
    gradient(c, CGRect(x: 0, y: 0, width: w, height: h), [rgb("#071d28", 0.60), rgb("#09242c", 0.13), rgb("#061820", 0.77)],
             start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: h))

    // Colorful arcade rays and drifting sparkles frame the playable portrait.
    c.saveGState(); c.translateBy(x: w / 2, y: 925)
    for i in 0..<14 {
        let a = CGFloat(i) * 0.4488 + CGFloat(t * 0.12)
        let len = 740 + CGFloat((i % 3) * 95)
        c.beginPath(); c.move(to: .zero); c.addLine(to: CGPoint(x: cos(a) * len, y: sin(a) * len))
        c.setStrokeColor(rgb(i % 2 == 0 ? "#fff4b8" : "#a4fff0", 0.10)); c.setLineWidth(i % 3 == 0 ? 5 : 2); c.strokePath()
    }
    c.restoreGState()

    // Header lockup.
    rounded(c, CGRect(x: 72, y: 70, width: 936, height: 166), 42, rgb("#092a32", 0.84), stroke: rgb("#d8ffca", 0.34), line: 3)
    drawText(c, "VINE TRIP  •  ONE-FINGER SWING", center: w/2, top: 87, size: 27, color: rgb("#bdf1d1"), maxWidth: 860, stroke: 5)
    drawText(c, "ツタワタリ", center: w/2, top: 124, size: 77, color: rgb("#fff4dd"), outline: rgb("#123b3a"), maxWidth: 860, stroke: 12)

    let panel = CGRect(x: 76, y: 266, width: 928, height: 1376)
    rounded(c, panel, 54, rgb("#09242c", 0.92), stroke: rgb("#d9f4d7", 0.80), line: 5)
    // In-game HUD.
    rounded(c, CGRect(x: 86, y: 276, width: 908, height: 200), 46, rgb("#14383a"))
    drawText(c, String(format: "%02d  %@", min(8, sceneIndex(t) + 1), ["草原", "川と沼", "街", "雪国", "溶岩帯", "砂漠"][sceneIndex(t)]), center: 220, top: 302, size: 34, color: rgb("#d6e6cb"), maxWidth: 290, stroke: 6)
    drawText(c, "TIME", center: 488, top: 315, size: 24, color: rgb("#a6cabd"), maxWidth: 120, stroke: 4)
    drawText(c, String(format: "%02d:%04.1f", Int(t/60), t.truncatingRemainder(dividingBy: 60)), center: 655, top: 298, size: 46, color: rgb("#fff2d0"), maxWidth: 310, stroke: 7)
    drawText(c, "ミス", center: 824, top: 317, size: 28, color: rgb("#c5d9cc"), maxWidth: 105, stroke: 5)
    drawText(c, t > 7 && t < 8.2 ? "1" : "0", center: 927, top: 299, size: 46, color: rgb("#fff2d0"), maxWidth: 65, stroke: 7)
    rounded(c, CGRect(x: 89, y: 470, width: 902, height: 1030), 12, rgb("#5bb7b2"))

    let index = sceneIndex(t)
    let skies = ["#67c8b4", "#67bad0", "#b2dce8", "#8bc9e1", "#ed8b4c", "#f3ca75"]
    let bottoms = ["#285c42", "#286b72", "#435969", "#d8f5ee", "#9b3e2a", "#b48045"]
    let sceneRect = CGRect(x: 91, y: 481, width: 898, height: 1009)
    gradient(c, sceneRect, [rgb(skies[index]), rgb(bottoms[index])], start: CGPoint(x: 500, y: 480), end: CGPoint(x: 500, y: 1490))
    // Sun, clouds, distant hills, and a changing near-ground silhouette.
    c.setFillColor(rgb(index == 4 ? "#ffd169" : "#fff2b3", 0.94)); c.fillEllipse(in: CGRect(x: 760, y: 555, width: 118, height: 118))
    for j in 0..<5 {
        let x = CGFloat(j) * 220 - CGFloat((Int(t * 13) + j * 37) % 170)
        let y = 626 + CGFloat((j % 3) * 56)
        c.setFillColor(rgb("#fff8eb", 0.56)); c.fillEllipse(in: CGRect(x: x, y: y, width: 150, height: 36))
        c.fillEllipse(in: CGRect(x: x + 32, y: y - 18, width: 85, height: 46))
    }
    // Distant mountain layers.
    for layer in 0..<3 {
        let y = CGFloat(980 + layer * 85)
        c.beginPath(); c.move(to: CGPoint(x: 90, y: y + 180))
        for j in 0..<7 {
            let x = CGFloat(j) * 155 + 35
            c.addLine(to: CGPoint(x: x, y: y + CGFloat((j * 83 + layer * 41) % 90)))
            c.addLine(to: CGPoint(x: x + 70, y: y - CGFloat((j * 41 + 85) % 130)))
        }
        c.addLine(to: CGPoint(x: 995, y: y + 250)); c.addLine(to: CGPoint(x: 995, y: 1495)); c.addLine(to: CGPoint(x: 90, y: 1495)); c.closePath()
        c.setFillColor(rgb(["#438478", "#316758", "#274c41"][layer], 0.82)); c.fillPath()
    }
    if index == 1 { // river shines across the lowlands
        c.beginPath(); c.move(to: CGPoint(x: 91, y: 1340)); c.addCurve(to: CGPoint(x: 990, y: 1285), control1: CGPoint(x: 340, y: 1175), control2: CGPoint(x: 680, y: 1515)); c.addLine(to: CGPoint(x: 990, y: 1490)); c.addLine(to: CGPoint(x: 91, y: 1490)); c.closePath(); c.setFillColor(rgb("#6edff2", 0.9)); c.fillPath()
    } else if index == 2 { // distant playful skyline
        for i in 0..<9 {
            let x = CGFloat(145 + i * 92), hh = CGFloat(170 + (i * 73) % 230)
            rounded(c, CGRect(x: x, y: 1490-hh, width: 65, height: hh), 7, rgb(["#60777c", "#596d79", "#71848a"][i % 3], 0.9))
            for yy in stride(from: 0, through: Int(hh-40), by: 46) { c.setFillColor(rgb("#ffe6a8", 0.75)); c.fill(CGRect(x: x+19, y: 1490-hh+24+CGFloat(yy), width: 11, height: 16)) }
        }
    } else if index == 3 { // snow specks
        c.setFillColor(rgb("#ffffff", 0.8))
        for i in 0..<95 { let x = CGFloat((i * 131 + Int(t*29)) % 890) + 95; let y = CGFloat((i * 197 + Int(t*52)) % 950) + 500; c.fillEllipse(in: CGRect(x: x, y: y, width: 5, height: 5)) }
    } else if index == 4 { // glowing lava cracks
        for i in 0..<8 { let x = CGFloat(145+i*125); line(c, [CGPoint(x:x,y:1420),CGPoint(x:x-24,y:1470),CGPoint(x:x+18,y:1500)], color: rgb("#ffb63e", 0.95), width: 8) }
    }
    // Foreground ledges.
    c.beginPath(); c.move(to: CGPoint(x: 90, y: 1398)); c.addCurve(to: CGPoint(x: 990, y: 1415), control1: CGPoint(x: 320,y:1350),control2: CGPoint(x: 720,y:1434)); c.addLine(to: CGPoint(x: 990,y:1500)); c.addLine(to: CGPoint(x: 90,y:1500)); c.closePath(); c.setFillColor(rgb(bottoms[index])); c.fillPath()

    let swing = sin((t - floor(t / 2.4) * 2.4) * 2.45)
    let baseX: CGFloat = 382 + CGFloat(swing) * 140
    let baseY: CGFloat = 934 + CGFloat(cos(t * 2.45)) * 25
    let nextX: CGFloat = 800 + CGFloat(sin(t * 1.4)) * 26
    // The vines are intentionally broad, like the generous in-game grab target.
    line(c, [CGPoint(x: 362, y: 480), CGPoint(x: 366, y: 610), CGPoint(x: baseX, y: 714)], color: rgb("#29633d"), width: 18)
    line(c, [CGPoint(x: 780, y: 480), CGPoint(x: 797, y: 628), CGPoint(x: nextX, y: 724)], color: rgb("#2b6741"), width: 20)
    for i in 0..<8 {
        let y = CGFloat(520 + i * 24)
        c.setFillColor(rgb(i % 2 == 0 ? "#b1df75" : "#78b95e")); c.fillEllipse(in: CGRect(x: 350 + CGFloat((i%3)*17), y: y, width: 28, height: 12))
        c.fillEllipse(in: CGRect(x: 770 + CGFloat((i%3)*23), y: y+38, width: 26, height: 12))
    }
    let falling = t > 5.65 && t < 8.15
    let drop = falling ? min(390, CGFloat((t - 5.65) * 285)) : 0
    let heroX = falling ? baseX + CGFloat(t - 5.65) * 105 : baseX
    let heroY = falling ? baseY + drop : baseY
    drawImage(c, hero, in: CGRect(x: heroX - 156, y: heroY - 245, width: 312, height: 468), angle: falling ? CGFloat((t - 5.65) * 2.1) : CGFloat(swing * -0.15))
    // Catch ring and speed streaks sell the exact jump/catch loop.
    if (t > 3.9 && t < 5.55) || (t > 19.2 && t < 21.0) {
        let r = CGFloat(30 + (sin(t * 16) + 1) * 31)
        c.setStrokeColor(rgb("#fff5a9", 0.92)); c.setLineWidth(9); c.strokeEllipse(in: CGRect(x: nextX-r, y: 754-r, width: r*2, height: r*2))
        c.setStrokeColor(rgb("#7cf8dc", 0.8)); c.setLineWidth(4); c.strokeEllipse(in: CGRect(x: nextX-r-14, y: 754-r-14, width: (r+14)*2, height: (r+14)*2))
    }
    if t < 2.1 || (t > 14.8 && t < 18.8) || (t > 22.8 && t < 26.2) {
        for i in 0..<6 { let yy = heroY + 50 + CGFloat(i*29); line(c,[CGPoint(x: heroX-285-CGFloat(i*15),y: yy),CGPoint(x: heroX-215-CGFloat(i*12),y: yy-14)],color:rgb("#fff1b7",0.6),width:7) }
    }
    // On-screen control hint.
    rounded(c, CGRect(x: 90, y: 1494, width: 900, height: 138), 0, rgb("#123537"))
    rounded(c, CGRect(x: 124, y: 1510, width: 832, height: 94), 26, rgb("#f4d192"), stroke: rgb("#fff1c3"), line: 3)
    drawText(c, "◉", center: 285, top: 1525, size: 45, color: rgb("#513c26"), outline: rgb("#f4d192"), maxWidth: 70, stroke: 2)
    drawText(c, t < 3.6 ? "長押しして、揺らそう" : "離してジャンプ！　次のツタをつかめ", center: 626, top: 1534, size: 34, color: rgb("#3e3629"), outline: rgb("#f4d192"), maxWidth: 610, stroke: 2)

    // Animated comic burst behind each one-line message.
    let current = beat(at: t)
    let timeIn = max(0, min(1, (t - current.start) / 0.24))
    let overshoot = 1 + sin(timeIn * .pi) * 0.11
    if t < 27.2 {
        c.saveGState(); c.translateBy(x: w/2, y: 581); c.scaleBy(x: overshoot, y: overshoot)
        rounded(c, CGRect(x: -425, y: -82, width: 850, height: 168), 38, rgb("#0b2d34", 0.9), stroke: rgb(current.color, 0.96), line: 7)
        c.restoreGState()
        drawText(c, current.tag, center: w/2, top: 512, size: 24, color: rgb(current.color), outline: rgb("#08262c"), maxWidth: 790, stroke: 4)
        for (i, s) in current.lines.enumerated() {
            drawText(c, s, center: w/2, top: CGFloat(548 + i * 62), size: 48, color: rgb(current.color), outline: rgb("#102b32"), maxWidth: 805, stroke: 10)
        }
    }

    // A burst of confetti lives around (not over) the game area.
    let celebrate = t > 26.7
    for i in 0..<58 {
        let x = CGFloat((i * 197 + Int(t * 53) * (i % 7 + 1)) % 1080)
        let y = CGFloat((i * 283 + Int(t * 116) * (i % 5 + 2)) % 1840)
        let s = CGFloat(5 + i % 11)
        c.saveGState(); c.translateBy(x: x, y: y); c.rotate(by: CGFloat(t * 2 + Double(i))); c.setFillColor(rgb(["#ffe34f", "#ff6f68", "#90f2cf", "#83d9ff", "#ffb7f3"][i % 5], celebrate ? 0.9 : 0.5)); c.fill(CGRect(x: -s/2,y: -s/3,width: s,height: s*0.68)); c.restoreGState()
    }

    if t >= 27.2 || cover {
        // Opaque end card; safe margins keep the title and URL clear of app chrome.
        c.setFillColor(rgb("#06232a", 0.94)); c.fill(CGRect(x: 68,y: 330,width: 944,height: 1210))
        rounded(c, CGRect(x: 108,y: 445,width: 864,height: 1000), 62, rgb("#0b3037", 0.96), stroke: rgb("#c9ebc3", 0.84), line: 6)
        drawText(c, "VINE TRIP", center: w/2, top: 570, size: 32, color: rgb("#bdf1d1"), maxWidth: 760, stroke: 5)
        drawText(c, "ツタワタリ", center: w/2, top: 645, size: 112, color: rgb("#fff3d6"), outline: rgb("#104438"), maxWidth: 800, stroke: 15)
        drawImage(c, hero, in: CGRect(x: 373,y: 795,width: 334,height: 500), angle: CGFloat(sin(t * 2) * 0.08))
        rounded(c, CGRect(x: 193,y: 1297,width: 694,height: 100), 34, rgb("#f4d192"), stroke: rgb("#fff4ce"), line: 4)
        drawText(c, "今すぐプレイ！", center: w/2, top: 1314, size: 48, color: rgb("#352b20"), outline: rgb("#f4d192"), maxWidth: 620, stroke: 3)
        drawText(c, "game.chozo.net/tsutawatari", center: w/2, top: 1465, size: 30, color: rgb("#eff8e9"), outline: rgb("#082a2e"), maxWidth: 840, stroke: 5)
    }
}

func saveJPEG(_ context: CGContext, _ url: URL) throws {
    let image = context.makeImage()!
    let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.jpeg" as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
    CGImageDestinationFinalize(dest)
}

try? FileManager.default.removeItem(at: framesDir)
try FileManager.default.createDirectory(at: framesDir, withIntermediateDirectories: true)
var coverWritten = false
for frame in 0..<frames {
    let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.translateBy(x: 0, y: CGFloat(height)); ctx.scaleBy(x: 1, y: -1)
    ctx.translateBy(x: 0, y: CGFloat(height)); ctx.scaleBy(x: 1, y: -1)
    let time = Double(frame) / Double(fps)
    drawScene(ctx, time: time)
    let frameURL = framesDir.appendingPathComponent(String(format: "frame-%05d.jpg", frame))
    try saveJPEG(ctx, frameURL)
    if !coverWritten && time >= 27.6 { try saveJPEG(ctx, coverURL); coverWritten = true }
}
print("Created \(frames) frames at \(framesDir.path) and \(coverURL.path)")
