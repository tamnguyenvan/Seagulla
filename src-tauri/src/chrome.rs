//! Native window chrome.
//!
//! macOS gets vibrancy and an inset for the traffic lights; every other platform gets a
//! plain opaque window so a Linux development build still renders correctly. See
//! `docs/macos-native-in-tauri.md`.

use tauri::{App, Manager};

pub fn apply(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

        // The sidebar material is what produces the translucency over the desktop. The
        // content pane paints itself opaque again in CSS, deliberately: thumbnails need a
        // stable background for accurate colour judgement.
        apply_vibrancy(
            &window,
            NSVisualEffectMaterial::Sidebar,
            Some(NSVisualEffectState::FollowsWindowActiveState),
            None,
        )?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = &window;
    }

    Ok(())
}
