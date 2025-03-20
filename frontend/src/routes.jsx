import { lazy } from "react";
import LazyComponent from "@/components/LazyComponent";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const routes = [
  { path: "/", element: <LazyComponent component={Landing} /> },
  { path: "/auth/login", element: <LazyComponent component={Login} /> },
  { path: "/auth/signup", element: <LazyComponent component={Signup} /> },
  { path: "/dashboard", element: <LazyComponent component={Dashboard} /> },
];

export default routes;
