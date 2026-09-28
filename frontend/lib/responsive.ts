/**
 * Responsive Breakpoints
 * Mobile First Approach
 */

export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1360,
};

export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  smOnly: `(max-width: ${breakpoints.md - 1}px)`,
  mdOnly: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lgOnly: `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
};

/**
 * Responsive Utility Hooks
 */
export const useResponsive = () => {
  // Hook to detect screen size
  if (typeof window === "undefined") return { isSmall: false, isMedium: false, isLarge: false };

  const isMobile = window.innerWidth < breakpoints.md;
  const isTablet = window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg;
  const isDesktop = window.innerWidth >= breakpoints.lg;

  return {
    isSmall: isMobile,
    isMedium: isTablet,
    isLarge: isDesktop,
    isMobile,
    isTablet,
    isDesktop,
    width: window.innerWidth,
  };
};

/**
 * Common Responsive CSS Classes
 */
export const responsiveClasses = {
  // Display utilities
  hideOnMobile: "hide-on-mobile", // display: none on mobile
  hideOnTablet: "hide-on-tablet", // display: none on tablet
  hideOnDesktop: "hide-on-desktop", // display: none on desktop
  showOnMobile: "show-on-mobile",
  showOnTablet: "show-on-tablet",
  showOnDesktop: "show-on-desktop",

  // Layout utilities
  gridResponsive: "grid-responsive", // 1 col mobile, 2 col tablet, 3+ col desktop
  containerResponsive: "container-responsive",
};

/**
 * Responsive Image Helper
 */
export function useResponsiveImage(imagePath: string) {
  return {
    src: imagePath,
    srcSet: `
      ${imagePath}?w=480 480w,
      ${imagePath}?w=768 768w,
      ${imagePath}?w=1024 1024w,
      ${imagePath}?w=1360 1360w
    `,
    sizes: `(max-width: 480px) 100vw,
            (max-width: 768px) 100vw,
            (max-width: 1024px) 100vw,
            1360px`,
  };
}

/**
 * Responsive Padding/Margin Generator
 */
export function responsive(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const m = mobile;
  const t = tablet || mobile;
  const d = desktop || tablet || mobile;
  return `${m} @md ${t} @lg ${d}`;
}
