import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Typography = React.lazy(() => import('./views/theme/typography/Typography'))

// Base
const Accordion = React.lazy(() => import('./views/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('./views/base/breadcrumbs/Breadcrumbs'))
const Cards = React.lazy(() => import('./views/base/cards/Cards'))
const Carousels = React.lazy(() => import('./views/base/carousels/Carousels'))
const Collapses = React.lazy(() => import('./views/base/collapses/Collapses'))
const ListGroups = React.lazy(() => import('./views/base/list-groups/ListGroups'))
const Navs = React.lazy(() => import('./views/base/navs/Navs'))
const Paginations = React.lazy(() => import('./views/base/paginations/Paginations'))
const Placeholders = React.lazy(() => import('./views/base/placeholders/Placeholders'))
const Popovers = React.lazy(() => import('./views/base/popovers/Popovers'))
const Progress = React.lazy(() => import('./views/base/progress/Progress'))
const Spinners = React.lazy(() => import('./views/base/spinners/Spinners'))
const Tabs = React.lazy(() => import('./views/base/tabs/Tabs'))
const Tables = React.lazy(() => import('./views/base/tables/Tables'))
const Tooltips = React.lazy(() => import('./views/base/tooltips/Tooltips'))

// Buttons
const Buttons = React.lazy(() => import('./views/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('./views/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('./views/buttons/dropdowns/Dropdowns'))

//Forms
const ChecksRadios = React.lazy(() => import('./views/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('./views/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('./views/forms/form-control/FormControl'))
const InputGroup = React.lazy(() => import('./views/forms/input-group/InputGroup'))
const Layout = React.lazy(() => import('./views/forms/layout/Layout'))
const Range = React.lazy(() => import('./views/forms/range/Range'))
const Select = React.lazy(() => import('./views/forms/select/Select'))
const Validation = React.lazy(() => import('./views/forms/validation/Validation'))
const Dropdown = React.lazy(() => import('./views/forms/dropdown/Dropdown'))

const Charts = React.lazy(() => import('./views/charts/Charts'))
const Sites = React.lazy(() => import('./views/sites/Sites'))
const Categories = React.lazy(() => import('./views/categories/Categories'))
const Banners = React.lazy(() => import('./views/banners/Banners'))
const Routes = React.lazy(() => import('./views/routes/Routes'))
const Queries = React.lazy(() => import('./views/queries/Queries'))
const Users = React.lazy(() => import('./views/users/Users'))
const BonusTypes = React.lazy(() => import('./views/bonustypes/BonusTypes'))
const RouteStops = React.lazy(() => import('./views/routestops/RouteStops'))
const AppVersion = React.lazy(() => import('./views/appversion/AppVersion'))
const BannerPlacements = React.lazy(() => import('./views/banners/BannerPlacements'))
const BannerPackages = React.lazy(() => import('./views/banners/BannerPackages'))
const Submissions = React.lazy(() => import('./views/submissions/Submissions'))
const Comments = React.lazy(() => import('./views/comments/Comments'))
const Messages = React.lazy(() => import('./views/messages/Messages'))
const Events = React.lazy(() => import('./views/events/Events'))
const UserRoleRequests = React.lazy(() => import('./views/userRoleRequests/UserRoleRequests'))
const ProductModeration = React.lazy(() => import('./views/products/ProductModeration'))
const ProductCategories = React.lazy(() => import('./views/products/ProductCategories'))
const Plans = React.lazy(() => import('./views/plans/Plans'))
const Subscriptions = React.lazy(() => import('./views/plans/Subscriptions'))
const AnalyticsDashboard = React.lazy(() => import('./views/analytics/AnalyticsDashboard'))
const AnalyticsOverview = React.lazy(() => import('./views/analytics/AnalyticsOverview'))
const TrendingContent = React.lazy(() => import('./views/analytics/TrendingContent'))
const ActivityLogs = React.lazy(() => import('./views/analytics/ActivityLogs'))
const LoginHistory = React.lazy(() => import('./views/analytics/LoginHistory'))

// Icons
const CoreUIIcons = React.lazy(() => import('./views/icons/coreui-icons/CoreUIIcons'))
const Flags = React.lazy(() => import('./views/icons/flags/Flags'))
const Brands = React.lazy(() => import('./views/icons/brands/Brands'))

// Notifications
const Alerts = React.lazy(() => import('./views/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('./views/notifications/badges/Badges'))
const Modals = React.lazy(() => import('./views/notifications/modals/Modals'))
const Toasts = React.lazy(() => import('./views/notifications/toasts/Toasts'))

const Widgets = React.lazy(() => import('./views/widgets/Widgets'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/theme', name: 'Theme', element: Colors, exact: true },
  { path: '/theme/colors', name: 'Colors', element: Colors },
  { path: '/theme/typography', name: 'Typography', element: Typography },
  { path: '/base', name: 'Base', element: Cards, exact: true },
  { path: '/base/accordion', name: 'Accordion', element: Accordion },
  { path: '/base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  { path: '/base/cards', name: 'Cards', element: Cards },
  { path: '/base/carousels', name: 'Carousel', element: Carousels },
  { path: '/base/collapses', name: 'Collapse', element: Collapses },
  { path: '/base/list-groups', name: 'List Groups', element: ListGroups },
  { path: '/base/navs', name: 'Navs', element: Navs },
  { path: '/base/paginations', name: 'Paginations', element: Paginations },
  { path: '/base/placeholders', name: 'Placeholders', element: Placeholders },
  { path: '/base/popovers', name: 'Popovers', element: Popovers },
  { path: '/base/progress', name: 'Progress', element: Progress },
  { path: '/base/spinners', name: 'Spinners', element: Spinners },
  { path: '/base/tabs', name: 'Tabs', element: Tabs },
  { path: '/base/tables', name: 'Tables', element: Tables },
  { path: '/base/tooltips', name: 'Tooltips', element: Tooltips },
  { path: '/buttons', name: 'Buttons', element: Buttons, exact: true },
  { path: '/buttons/buttons', name: 'Buttons', element: Buttons },
  { path: '/buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
  { path: '/buttons/button-groups', name: 'Button Groups', element: ButtonGroups },
  { path: '/charts', name: 'Charts', element: Charts },
  { path: '/forms', name: 'Forms', element: FormControl, exact: true },
  { path: '/forms/form-control', name: 'Form Control', element: FormControl },
  { path: '/forms/select', name: 'Select', element: Select },
  { path: '/forms/dropdown', name: 'Dropdown', element: Dropdown },
  { path: '/forms/checks-radios', name: 'Checks & Radios', element: ChecksRadios },
  { path: '/forms/range', name: 'Range', element: Range },
  { path: '/forms/input-group', name: 'Input Group', element: InputGroup },
  { path: '/forms/floating-labels', name: 'Floating Labels', element: FloatingLabels },
  { path: '/forms/layout', name: 'Layout', element: Layout },
  { path: '/forms/validation', name: 'Validation', element: Validation },
  { path: '/icons', exact: true, name: 'Icons', element: CoreUIIcons },
  { path: '/icons/coreui-icons', name: 'CoreUI Icons', element: CoreUIIcons },
  { path: '/icons/flags', name: 'Flags', element: Flags },
  { path: '/icons/brands', name: 'Brands', element: Brands },
  { path: '/notifications', name: 'Notifications', element: Alerts, exact: true },
  { path: '/notifications/alerts', name: 'Alerts', element: Alerts },
  { path: '/notifications/badges', name: 'Badges', element: Badges },
  { path: '/notifications/modals', name: 'Modals', element: Modals },
  { path: '/notifications/toasts', name: 'Toasts', element: Toasts },
  { path: '/widgets', name: 'Widgets', element: Widgets },
  // New Routes from here
  { path: '/sites', name: 'Sites', element: Sites },
  { path: '/categories', name: 'Categories & Sub Categories', element: Categories },
  { path: '/banners', name: 'Banners', element: Banners },
  { path: '/routes', name: 'Routes', element: Routes },
  { path: '/queries', name: 'Queries', element: Queries },
  { path: '/users', name: 'Users', element: Users },
  { path: '/bonustypes', name: 'BonusTypes', element: BonusTypes },
  { path: '/routestops', name: 'RouteStops', element: RouteStops },
  { path: '/appversion', name: 'App Version', element: AppVersion },
  { path: '/banner-placements', name: 'Banner Placements', element: BannerPlacements },
  { path: '/banner-packages', name: 'Banner Packages', element: BannerPackages },
  { path: '/submissions', name: 'Site Submissions', element: Submissions },
  { path: '/comments', name: 'Comments', element: Comments },
  { path: '/messages', name: 'Messages', element: Messages },
  { path: '/events', name: 'Events', element: Events },
  { path: '/role-requests', name: 'Role Requests', element: UserRoleRequests },
  { path: '/products', name: 'Product Moderation', element: ProductModeration },
  { path: '/product-categories', name: 'Product Categories', element: ProductCategories },
  { path: '/plans', name: 'Plans', element: Plans },
  { path: '/subscriptions', name: 'Subscriptions', element: Subscriptions },
  { path: '/analytics', name: 'Analytics Dashboard', element: AnalyticsDashboard },
  { path: '/analytics/overview', name: 'Analytics Overview', element: AnalyticsOverview },
  { path: '/analytics/trending', name: 'Trending Content', element: TrendingContent },
  { path: '/analytics/activity-logs', name: 'Activity Logs', element: ActivityLogs },
  { path: '/analytics/login-history', name: 'Login History', element: LoginHistory },
]

export default routes
