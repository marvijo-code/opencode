import { Show, Suspense, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { createMediaQuery } from "@solid-primitives/media"
import { ResizeHandle } from "@opencode/ui/resize-handle"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { Tooltip } from "@opencode/ui/tooltip"
import { Titlebar } from "@/shell/titlebar/titlebar"
import { usePlatform } from "@/runtime/platform/platform"
import { ToastRegion } from "@/shell/notifications/toast"
import { UploadToastHost } from "@/composer/attachments/uploads"
import { TitlebarRightProvider } from "@/shell/titlebar/right-slot"
import { useSettingsSurface } from "@/settings/surface"
import { useSettings } from "@/settings/model"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { ExtensionServerCover } from "@/runtime/extension/server-shell"
import { ExtensionSlot } from "@/runtime/extension/render"

export default function Layout(props: ParentProps) {
  const platform = usePlatform()
  const settings = useSettingsSurface()
  const preferences = useSettings()
  const command = useCommand()
  const language = useLanguage()
  const mobile = createMediaQuery("(max-width: 767px)")

  const [state, setState] = createStore<{ tabsWidth: number; tabsMount: HTMLElement | undefined }>({
    tabsWidth: 260,
    tabsMount: undefined,
  })

  const verticalTabs = () => preferences.appearance.tabLayout() === "vertical" && !mobile()
  const bottomTitlebar = () => mobile() && preferences.general.mobileTitlebarPosition() === "bottom"

  const sidebarOpen = () => preferences.appearance.sidebarOpen()
  const toggleSidebar = () => preferences.appearance.setSidebarOpen(!sidebarOpen())

  const openSidebar = () => {
    if (mobile()) return

    if (!verticalTabs()) preferences.appearance.setTabLayout("vertical")
    preferences.appearance.setSidebarOpen(true)
  }

  // Runs from any screen: horizontal tabs draw no sidebar, so the key moves them into the vertical rail first.
  const toggleSidebarFromAnywhere = () => (verticalTabs() ? toggleSidebar() : openSidebar())

  command.register("sidebar", () => [
    {
      id: "sidebar.toggle",
      keybind: "mod+b",
      title: language.t("command.sidebar.toggle"),
      category: language.t("command.category.view"),
      onSelect: toggleSidebarFromAnywhere,
    },
  ])

  return (
    <TitlebarRightProvider>
      <div
        class="relative bg-v2-background-bg-deep flex-1 min-h-0 min-w-0 flex flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_[contenteditable]]:select-text"
        style={{
          // Mobile panels only need clearance for their outer border.
          "--shell-inline-inset": mobile() ? "1px" : "8px",
          // A bottom mobile titlebar leaves main's top edge to the safe area. Native Windows chrome supplies the gap;
          // retain outer-outline clearance.
          "--shell-top-inset": bottomTitlebar()
            ? "0px"
            : platform.platform === "desktop" && platform.os === "windows"
              ? "1px"
              : "8px",
          "--shell-bottom-inset": bottomTitlebar()
            ? "8px"
            : "max(0px, calc(8px - var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))",
        }}
      >
        <Titlebar
          verticalTabs={
            verticalTabs() ? { mount: state.tabsMount, open: sidebarOpen, toggle: toggleSidebar } : undefined
          }
        />
        <div class="relative flex flex-1 min-h-0 min-w-0 flex-row">
          <Show when={verticalTabs()}>
            <aside
              id="vertical-tabs-sidebar"
              ref={(element) => setState("tabsMount", element)}
              data-slot="vertical-tabs-sidebar"
              data-state={sidebarOpen() ? "open" : "closed"}
              class="relative flex h-full min-h-0 shrink-0 flex-col bg-v2-background-bg-deep pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]"
              classList={{
                "pe-0.5 ps-2.5": sidebarOpen(),
                "overflow-hidden pe-0 ps-0": !sidebarOpen(),
              }}
              style={{
                width: sidebarOpen() ? `${state.tabsWidth}px` : "0px",
                "padding-bottom": "max(10px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
              }}
            >
              <ResizeHandle
                class={sidebarOpen() ? "-end-2" : "-end-2 hidden"}
                direction="horizontal"
                size={state.tabsWidth}
                min={140}
                max={520}
                onResize={(width) => setState("tabsWidth", width)}
              />
            </aside>
          </Show>
          {/* Windows keeps its titlebar, which holds the toggle; other platforms hide it, so offer one here. */}
          <Show
            when={verticalTabs() && !sidebarOpen() && !(platform.platform === "desktop" && platform.os === "windows")}
          >
            <div class="absolute z-40 start-[calc(var(--shell-inline-inset,8px)+10px)] top-[calc(var(--shell-top-inset,8px)+10px)]">
              <Tooltip placement="bottom" value={language.t("command.sidebar.toggle")}>
                <IconButton
                  type="button"
                  variant="ghost-muted"
                  size="large"
                  class="shrink-0"
                  onClick={openSidebar}
                  aria-label={language.t("command.sidebar.toggle")}
                  aria-controls="vertical-tabs-sidebar"
                  aria-expanded={false}
                  icon={<Icon name="layout-left" />}
                />
              </Tooltip>
            </div>
          </Show>
          {/* Size containment collapses percentage-height descendants in WebKit. */}
          <main
            class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-content"
            style={{
              "padding-top": bottomTitlebar() ? "env(safe-area-inset-top, 0px)" : "0px",
              "padding-bottom":
                bottomTitlebar() || settings.active()
                  ? "0px"
                  : "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
              "--settings-bottom-inset": bottomTitlebar()
                ? "40px"
                : "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <ExtensionServerCover>
              <Suspense>{props.children}</Suspense>
            </ExtensionServerCover>
          </main>
        </div>
        <ExtensionSlot at="window.bottom" input={{}} />
        <ToastRegion />
        <UploadToastHost />
      </div>
    </TitlebarRightProvider>
  )
}
