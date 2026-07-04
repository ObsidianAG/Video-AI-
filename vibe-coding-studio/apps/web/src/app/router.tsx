import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { Layout } from '../components/layout/layout'
import { IndexRoute } from '../routes/index'
import { StudioRoute } from '../routes/studio'
import { PromptsRoute } from '../routes/prompts'
import { VibesRoute } from '../routes/vibes'
import { BoardRoute } from '../routes/board'
import { ChecklistRoute } from '../routes/checklist'
import { SettingsRoute } from '../routes/settings'
import { NotFoundRoute } from '../routes/not-found'

function RootComponent() {
  return <Outlet />
}

const rootRoute = createRootRoute({
  component: RootComponent,
})

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute,
})

const studioRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/studio',
  component: StudioRoute,
})

const promptsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/prompts',
  component: PromptsRoute,
})

const vibesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/vibes',
  component: VibesRoute,
})

const boardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/board',
  component: BoardRoute,
})

const checklistRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/checklist',
  component: ChecklistRoute,
})

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsRoute,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  layoutRoute.addChildren([
    studioRoute,
    promptsRoute,
    vibesRoute,
    boardRoute,
    checklistRoute,
    settingsRoute,
  ]),
  notFoundRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
