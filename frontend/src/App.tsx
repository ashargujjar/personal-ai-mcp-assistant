import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Approvals from "@/pages/Approvals";
import Assistant from "@/pages/Assistant";
import Calendar from "@/pages/Calendar";
import Dashboard from "@/pages/Dashboard";
import Database from "@/pages/Database";
import Email from "@/pages/Email";
import GitHub from "@/pages/GitHub";
import Knowledge from "@/pages/Knowledge";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import Meetings from "@/pages/Meetings";
import Memory from "@/pages/Memory";
import NotFound from "@/pages/NotFound";
import Notes from "@/pages/Notes";
import ResumeScreening from "@/pages/ResumeScreening";
import Settings from "@/pages/Settings";
import Signup from "@/pages/Signup";
import Tasks from "@/pages/Tasks";
import ToolActivity from "@/pages/ToolActivity";
import Voice from "@/pages/Voice";
import Webhooks from "@/pages/Webhooks";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/logout" element={<Logout />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/voice" element={<Voice />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/email" element={<Email />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/resume-screening" element={<ResumeScreening />} />
        <Route path="/github" element={<GitHub />} />
        <Route path="/database" element={<Database />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/tool-activity" element={<ToolActivity />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
