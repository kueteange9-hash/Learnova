# Responsive Design Code Snippets

Quick reference for common responsive patterns used in Learnova.

## Table of Contents
1. [Responsive Grid](#responsive-grid)
2. [Responsive Navigation](#responsive-navigation)
3. [Responsive Typography](#responsive-typography)
4. [Responsive Spacing](#responsive-spacing)
5. [Show/Hide Content](#showhide-content)
6. [Responsive Images](#responsive-images)
7. [Touch-Friendly Buttons](#touch-friendly-buttons)
8. [Responsive Components](#responsive-components)

---

## Responsive Grid

### Single Column to Multi-Column

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  padding: 15px;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 25px;
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    padding: 40px;
  }
}
```

### Hero Section (2 Columns on Desktop)

```css
.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  padding: 30px 15px;
}

@media (min-width: 768px) {
  .hero {
    padding: 50px 25px;
  }
}

@media (min-width: 1024px) {
  .hero {
    grid-template-columns: 52% 48%;
    gap: 60px;
    padding: 60px 55px;
  }
}
```

---

## Responsive Navigation

### Hamburger Menu Pattern

**HTML/TSX:**
```tsx
export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="logo">Logo</div>
      
      <button 
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={menuOpen ? "active" : ""}>
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}
```

**CSS:**
```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: white;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
}

.menu-toggle span {
  width: 24px;
  height: 2px;
  background: black;
  transition: all 0.3s ease;
}

nav {
  display: flex;
  gap: 20px;
}

/* Mobile: Show toggle, hide nav */
@media (max-width: 767px) {
  .menu-toggle {
    display: flex;
  }

  nav {
    display: none;
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: white;
    padding: 15px;
    border-top: 1px solid #e0e0e0;
  }

  nav.active {
    display: flex;
  }
}

/* Tablet+: Hide toggle, show nav */
@media (min-width: 768px) {
  nav {
    display: flex !important;
  }
}
```

---

## Responsive Typography

### Heading Sizes

```css
h1 {
  font-size: 24px;  /* Mobile */
  line-height: 1.3;
  letter-spacing: -0.5px;
}

@media (min-width: 768px) {
  h1 {
    font-size: 36px;
    line-height: 1.2;
    letter-spacing: -1px;
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: 48px;
    line-height: 1.1;
    letter-spacing: -1.5px;
  }
}
```

### Body Text

```css
body {
  font-size: 14px;
  line-height: 1.6;
}

p {
  max-width: 100%;
  margin: 0 0 15px;
}

@media (min-width: 768px) {
  body {
    font-size: 15px;
  }

  p {
    max-width: 600px;
    margin: 0 0 20px;
  }
}

@media (min-width: 1024px) {
  body {
    font-size: 16px;
  }

  p {
    margin: 0 0 25px;
  }
}
```

---

## Responsive Spacing

### Padding Adjustments

```css
.container {
  padding: 15px;           /* Mobile: 15px */
}

@media (min-width: 768px) {
  .container {
    padding: 25px;         /* Tablet: 25px */
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 40px;         /* Desktop: 40px */
  }
}
```

### Margin Adjustments

```css
.card {
  margin-bottom: 15px;
}

@media (min-width: 768px) {
  .card {
    margin-bottom: 20px;
  }
}

@media (min-width: 1024px) {
  .card {
    margin-bottom: 30px;
  }
}
```

### Gap in Flexbox/Grid

```css
.flex-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .flex-container {
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .flex-container {
    gap: 20px;
  }
}
```

---

## Show/Hide Content

### Hide on Mobile

```css
.desktop-only {
  display: block;
}

@media (max-width: 767px) {
  .desktop-only {
    display: none;
  }
}
```

### Hide on Desktop

```css
.mobile-only {
  display: none;
}

@media (max-width: 767px) {
  .mobile-only {
    display: block;
  }
}
```

### Hide on Tablet

```css
.tablet-only {
  display: none;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .tablet-only {
    display: block;
  }
}
```

### Using React Hook

```tsx
import { useResponsive } from "@/lib/responsive";

export function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </>
  );
}
```

---

## Responsive Images

### CSS Approach

```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### HTML Picture Element

```html
<picture>
  <source media="(min-width: 1024px)" srcset="desktop-image.jpg">
  <source media="(min-width: 768px)" srcset="tablet-image.jpg">
  <img src="mobile-image.jpg" alt="Responsive image">
</picture>
```

### Using srcSet

```html
<img 
  src="image.jpg"
  srcset="
    image-480w.jpg 480w,
    image-768w.jpg 768w,
    image-1024w.jpg 1024w,
    image-1360w.jpg 1360w
  "
  sizes="
    (max-width: 480px) 100vw,
    (max-width: 768px) 100vw,
    (max-width: 1024px) 100vw,
    1360px
  "
  alt="Description"
>
```

### Next.js Image Component

```tsx
import Image from 'next/image';

export default function ResponsiveImage() {
  return (
    <Image
      src="/my-image.jpg"
      alt="My image"
      width={1360}
      height={680}
      responsive
      sizes="(max-width: 768px) 100vw,
             (max-width: 1200px) 50vw,
             33vw"
    />
  );
}
```

---

## Touch-Friendly Buttons

```css
button {
  /* Minimum 44x44px for mobile touch */
  min-height: 44px;
  min-width: 44px;
  padding: 10px 16px;
  
  /* Nice spacing */
  margin: 5px;
  
  /* Avoid double-tap zoom */
  font-size: 16px;
  
  /* Better touch feedback */
  cursor: pointer;
  transition: all 0.3s ease;
}

button:active {
  transform: scale(0.98);
}

@media (min-width: 768px) {
  button {
    padding: 12px 19px;
    font-size: 14px;
    min-height: 40px;
  }
}

/* Don't let text wrap on mobile */
@media (max-width: 479px) {
  button {
    white-space: nowrap;
    font-size: 13px;
  }
}
```

---

## Responsive Components

### Card Component

```tsx
export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`card responsive-card ${className}`}>{children}</div>;
}
```

```css
.responsive-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
}

@media (min-width: 768px) {
  .responsive-card {
    padding: 20px;
    margin-bottom: 16px;
    border-radius: 12px;
  }
}

@media (min-width: 1024px) {
  .responsive-card {
    padding: 25px;
    margin-bottom: 20px;
    border-radius: 16px;
  }
}
```

### Grid Layout Component

```tsx
interface GridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
}

export default function ResponsiveGrid({ 
  children, 
  columns = 3,
  gap = 20 
}: GridProps) {
  return (
    <div 
      className="responsive-grid"
      style={{
        '--columns': columns,
        '--gap': `${gap}px`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
```

```css
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--gap, 15px);
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(var(--columns, 3), 1fr);
  }
}
```

---

## Testing Responsive Design

### Chrome DevTools

```
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device from dropdown
4. Test interaction
```

### Media Query Breakpoints to Test

```
- 375px  (iPhone SE)
- 480px  (Small phone)
- 768px  (Tablet)
- 1024px (Laptop)
- 1360px (Desktop)
```

### CSS Media Query Tips

```css
/* Good: Mobile-first */
.element {
  /* Mobile styles */
}

@media (min-width: 768px) {
  .element {
    /* Tablet+ styles */
  }
}

/* Avoid: Desktop-first */
.element {
  /* Desktop styles */
}

@media (max-width: 767px) {
  .element {
    /* Mobile styles */
  }
}
```

---

## Common Patterns

### Responsive Container

```css
.container {
  width: 100%;
  padding: 0 15px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container {
    width: 750px;
    padding: 0;
  }
}

@media (min-width: 1024px) {
  .container {
    width: 1000px;
  }
}

@media (min-width: 1360px) {
  .container {
    width: 1360px;
  }
}
```

### Stacked to Row Layout

```css
.row {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

@media (min-width: 768px) {
  .row {
    flex-direction: row;
    gap: 20px;
  }
}

.row > * {
  flex: 1;
}
```

---

## Resources

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Google: Mobile-Friendly](https://support.google.com/webmasters/answer/6352038)
- [Web.dev: Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)

---

**Happy responsive coding! 🎉**
