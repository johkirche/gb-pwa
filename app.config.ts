export default defineAppConfig({
  icon: {
    mode: "css", // Use CSS mode for better performance
    clientBundle: {
      scan: true, // Automatically detect used icons
      sizeLimitKb: 256, // Limit client bundle size
    },
    serverBundle: "auto", // Use auto mode for optimal deployment
  },
});
