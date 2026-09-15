import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilEnvelopeClosed,
  cilGraph,
  cilNotes,
  cilPencil,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
  cilTask,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Analytics',
  },
  {
    component: CNavGroup,
    name: 'Analytics',
    to: '/analytics',
    icon: <CIcon icon={cilGraph} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Dashboard', to: '/analytics' },
      { component: CNavItem, name: 'Overview', to: '/analytics/overview' },
      { component: CNavItem, name: 'Trending Content', to: '/analytics/trending' },
      { component: CNavItem, name: 'Activity Logs', to: '/analytics/activity-logs' },
      { component: CNavItem, name: 'Login History', to: '/analytics/login-history' },
    ],
  },
  {
    component: CNavTitle,
    name: 'Tourkokan',
  },
  {
    component: CNavItem,
    name: 'App Version',
    to: '/appversion',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Categories',
    to: '/categories',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Sites',
    to: '/sites',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Events',
    to: '/events',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'All Events', to: '/events' },
    ],
  },
  {
    component: CNavItem,
    name: 'Comments',
    to: '/comments',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Messages',
    to: '/messages',
    icon: <CIcon icon={cilEnvelopeClosed} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Advertising',
    to: '/banners',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Banners', to: '/banners' },
      { component: CNavItem, name: 'Packages', to: '/banner-packages' },
      { component: CNavItem, name: 'Placements', to: '/banner-placements' },
    ],
  },
  {
    component: CNavTitle,
    name: 'Vendor Management',
  },
  {
    // Full vendor funnel in approval order: a user requests the vendor role,
    // gets a site approved, then products approved, then a plan/subscription.
    component: CNavGroup,
    name: 'Vendor Management',
    to: '/products',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: '1. Users', to: '/users' },
      { component: CNavItem, name: '2. Role Requests', to: '/role-requests' },
      { component: CNavItem, name: '3. Site Submissions', to: '/submissions' },
      { component: CNavItem, name: '4. Product Moderation', to: '/products' },
      { component: CNavItem, name: 'Product Categories', to: '/product-categories' },
      { component: CNavItem, name: 'Plans', to: '/plans' },
      { component: CNavItem, name: 'Subscriptions', to: '/subscriptions' },
    ],
  },
  {
    component: CNavTitle,
    name: 'MSRTC',
  },
  {
    component: CNavGroup,
    name: 'MSRTC',
    to: '/msrtc',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Bus Types',
        to: '/theme/bustypes',
      },
      {
        component: CNavItem,
        name: 'Routes',
        to: '/routes',
      },
      {
        component: CNavItem,
        name: 'Routes Stops',
        to: '/routestops',
      },
    ],
  },


  {
    component: CNavTitle,
    name: 'Users',
  },
  {
    component: CNavGroup,
    name: 'USERS',
    to: '/users',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Bonus Types',
        to: '/bonustypes',
      },
      {
        component: CNavItem,
        name: 'Users',
        to: '/users',
      },
      {
        component: CNavItem,
        name: 'Queries',
        to: '/queries',
        icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Theme',
  },
  {
    component: CNavItem,
    name: 'Colors',
    to: '/theme/colors',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Typography',
    to: '/theme/typography',
    icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Components',
  },
  {
    component: CNavGroup,
    name: 'Base',
    to: '/base',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Accordion',
        to: '/base/accordion',
      },
      {
        component: CNavItem,
        name: 'Breadcrumb',
        to: '/base/breadcrumbs',
      },
      {
        component: CNavItem,
        name: 'Cards',
        to: '/base/cards',
      },
      {
        component: CNavItem,
        name: 'Carousel',
        to: '/base/carousels',
      },
      {
        component: CNavItem,
        name: 'Collapse',
        to: '/base/collapses',
      },
      {
        component: CNavItem,
        name: 'List group',
        to: '/base/list-groups',
      },
      {
        component: CNavItem,
        name: 'Navs & Tabs',
        to: '/base/navs',
      },
      {
        component: CNavItem,
        name: 'Pagination',
        to: '/base/paginations',
      },
      {
        component: CNavItem,
        name: 'Placeholders',
        to: '/base/placeholders',
      },
      {
        component: CNavItem,
        name: 'Popovers',
        to: '/base/popovers',
      },
      {
        component: CNavItem,
        name: 'Progress',
        to: '/base/progress',
      },
      {
        component: CNavItem,
        name: 'Spinners',
        to: '/base/spinners',
      },
      {
        component: CNavItem,
        name: 'Tables',
        to: '/base/tables',
      },
      {
        component: CNavItem,
        name: 'Tabs',
        to: '/base/tabs',
      },
      {
        component: CNavItem,
        name: 'Tooltips',
        to: '/base/tooltips',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Buttons',
    to: '/buttons',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Buttons',
        to: '/buttons/buttons',
      },
      {
        component: CNavItem,
        name: 'Buttons groups',
        to: '/buttons/button-groups',
      },
      {
        component: CNavItem,
        name: 'Dropdowns',
        to: '/buttons/dropdowns',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Forms',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Form Control',
        to: '/forms/form-control',
      },
      {
        component: CNavItem,
        name: 'Select',
        to: '/forms/select',
      }, {
        component: CNavItem,
        name: 'Dropdown',
        to: '/forms/dropdown',
      },
      {
        component: CNavItem,
        name: 'Checks & Radios',
        to: '/forms/checks-radios',
      },
      {
        component: CNavItem,
        name: 'Range',
        to: '/forms/range',
      },
      {
        component: CNavItem,
        name: 'Input Group',
        to: '/forms/input-group',
      },
      {
        component: CNavItem,
        name: 'Floating Labels',
        to: '/forms/floating-labels',
      },
      {
        component: CNavItem,
        name: 'Layout',
        to: '/forms/layout',
      },
      {
        component: CNavItem,
        name: 'Validation',
        to: '/forms/validation',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Charts',
    to: '/charts',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Icons',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'CoreUI Free',
        to: '/icons/coreui-icons',
        badge: {
          color: 'success',
          text: 'NEW',
        },
      },
      {
        component: CNavItem,
        name: 'CoreUI Flags',
        to: '/icons/flags',
      },
      {
        component: CNavItem,
        name: 'CoreUI Brands',
        to: '/icons/brands',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Alerts',
        to: '/notifications/alerts',
      },
      {
        component: CNavItem,
        name: 'Badges',
        to: '/notifications/badges',
      },
      {
        component: CNavItem,
        name: 'Modal',
        to: '/notifications/modals',
      },
      {
        component: CNavItem,
        name: 'Toasts',
        to: '/notifications/toasts',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Widgets',
    to: '/widgets',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Extras',
  },
  {
    component: CNavGroup,
    name: 'Pages',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Login',
        to: '/login',
      },
      {
        component: CNavItem,
        name: 'Register',
        to: '/register',
      },
      {
        component: CNavItem,
        name: 'Error 404',
        to: '/404',
      },
      {
        component: CNavItem,
        name: 'Error 500',
        to: '/500',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Docs',
    href: 'https://coreui.io/react/docs/templates/installation/',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },
]

export default _nav
