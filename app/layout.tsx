import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "循环秘境 · Python 法术学院",
  description: "面向中小学生的 Python for 与 while 循环网页游戏原型。写下代码，让循环变成魔法。",
  icons: {
    icon: "/assets/tiles/tile_0128.png",
    shortcut: "/assets/tiles/tile_0128.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
