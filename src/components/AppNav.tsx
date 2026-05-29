import Link from 'next/link';

export function AppNav() {
  return (
    <nav className="nav" aria-label="주요 메뉴">
      <Link href="/village">마을</Link>
      <Link href="/matching">매칭</Link>
      <Link href="/shop">상점</Link>
    </nav>
  );
}
