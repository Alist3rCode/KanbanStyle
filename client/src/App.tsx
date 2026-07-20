import { useEffect, useState } from "react";
import { authApi } from "@/lib/auth";
import { type Board } from "@/lib/boards";
import { useTheme } from "@/lib/theme";
import { LoginForm } from "@/components/LoginForm";
import { BoardsPage } from "@/components/BoardsPage";
import { BoardView } from "@/components/BoardView";
import { SettingsPage } from "@/components/SettingsPage";
import { BoardTemplatePage } from "@/components/BoardTemplatePage";

type View = "boards" | "settings" | "board" | "template";

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("boards");
  const [openBoard, setOpenBoard] = useState<Board | null>(null);
  const [templateBoard, setTemplateBoard] = useState<Board | null>(null);
  const [templateOrigin, setTemplateOrigin] = useState<"boards" | "board">("boards");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    authApi.me().then((res) => setAuthenticated(res.authenticated));
  }, []);

  if (authenticated === null) return null;
  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  if (view === "settings") {
    return <SettingsPage theme={theme} setTheme={setTheme} onHome={() => setView("boards")} />;
  }
  if (view === "board" && openBoard) {
    return (
      <BoardView
        boardId={openBoard.id}
        boardTitle={openBoard.title}
        onHome={() => setView("boards")}
        onOpenSettings={() => setView("settings")}
        onOpenBoardSettings={() => {
          setTemplateBoard(openBoard);
          setTemplateOrigin("board");
          setView("template");
        }}
      />
    );
  }
  if (view === "template" && templateBoard) {
    return (
      <BoardTemplatePage
        boardId={templateBoard.id}
        boardTitle={templateBoard.title}
        onHome={() => setView("boards")}
        onBack={() => setView(templateOrigin === "board" ? "board" : "boards")}
      />
    );
  }

  return (
    <BoardsPage
      onOpenSettings={() => setView("settings")}
      onOpenBoard={(board) => {
        setOpenBoard(board);
        setView("board");
      }}
      onOpenTemplate={(board) => {
        setTemplateBoard(board);
        setTemplateOrigin("boards");
        setView("template");
      }}
    />
  );
}

export default App;
