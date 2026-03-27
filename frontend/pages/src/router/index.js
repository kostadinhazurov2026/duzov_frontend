import { createRouter, createWebHistory } from 'vue-router'
import HomepagePage from '../pages/HomepagePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import NotificationsPage from '../pages/NotificationsPage.vue'
import OfferPage from '../pages/OfferPage.vue'

const routes = [
  { path: '/', name: 'home', component: HomepagePage, alias: ['/Homepage.html', '/homepage.html', '/index.html'] },
  { path: '/login', name: 'login', component: LoginPage, alias: ['/login.html'] },
  { path: '/register', name: 'register', component: RegisterPage, alias: ['/register.html'] },
  { path: '/profil', name: 'profile', component: ProfilePage, alias: ['/profil.html', '/profile', '/profile.html'] },
  { path: '/notifikacii', name: 'notifications', component: NotificationsPage, alias: ['/notifikacii.html', '/notifications', '/notifications.html'] },
  { path: '/obyava', name: 'offer', component: OfferPage, alias: ['/obyava.html', '/offer', '/offer.html'] },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
