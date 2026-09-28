//
//  GalleryApp.swift
//  Seagulla
//

import DesignSystem
import SwiftUI

/// Host application for the design-system gallery.
///
/// Every component lands here — in every state, both appearances and both motion
/// settings — before it is used in the product. See `docs/ui-ux-spec.md` §14.
@main
struct GalleryApp: App {
  var body: some Scene {
    WindowGroup("Seagulla Design System") {
      GalleryRootView()
    }
    .defaultSize(width: 1000, height: 700)
  }
}

/// Placeholder root. Phase 1.5 replaces this with the component catalogue.
struct GalleryRootView: View {
  var body: some View {
    VStack(spacing: 12) {
      Text("Seagulla Design System")
        .font(.title2.weight(.semibold))
      Text("\(DesignSystemModule.name) · layer \(DesignSystemModule.layer)")
        .font(.callout)
        .foregroundStyle(.secondary)
      Text("Component catalogue arrives in P1.5.")
        .font(.footnote)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }
}

#Preview {
  GalleryRootView()
}
