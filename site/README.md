# GazeTracking API Documentation Site

This directory contains the complete API documentation for the GazeTracking eye tracking experiment platform, formatted in Maven-style HTML documentation.

## Documentation Structure

```
site/
├── index.html                  # Homepage and overview
├── css/
│   └── maven-theme.css        # Maven-inspired styling
└── api/
    ├── trial-manager.html     # TrialManager class documentation
    ├── methods.html           # Complete methods reference
    ├── properties.html        # Properties reference  
    ├── quick-start.html       # Getting started guide
    ├── gaze-tracking.html     # Gaze tracking deep dive
    └── calibration.html       # Calibration best practices
```

## Features

- **Maven-Style Design**: Professional documentation layout inspired by Apache Maven site generation
- **Comprehensive API Coverage**: Every method, property, and parameter documented with examples
- **Searchable**: Real-time search filtering on methods pages
- **Responsive**: Mobile-friendly layout
- **GitHub Pages Ready**: Automated deployment via GitHub Actions

## Publishing to GitHub Pages

The documentation is automatically published to GitHub Pages when you push to the main branch.

### Setup Instructions

1. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Source: GitHub Actions
   - Branch: main

2. **Push to Repository**:
   ```bash
   git add .
   git commit -m "Add API documentation site"
   git push origin main
   ```

3. **Access Documentation**:
   - Your docs will be available at: `https://mrhunsaker.github.io/GazeTracking/`
   - Allow 2-3 minutes for initial deployment

## Local Development

To preview documentation locally:

```bash
# Install http-server if not already installed
npm install -g http-server

# Serve the site directory
cd site
http-server -p 3000

# Open browser to http://localhost:3000
```

## Documentation Highlights

### Main Pages

- **Overview** (`index.html`): Features, architecture, requirements
- **TrialManager** (`api/trial-manager.html`): Core class documentation
- **Methods** (`api/methods.html`): Complete alphabetical reference
- **Quick Start** (`api/quick-start.html`): Setup and first experiment

### Key Features Documented

- Kalman Filtering (q=0.01, r=0.1)
- Head Pose Compensation (roll, pitch, yaw tracking)
- Outlier Detection (>500px jumps, off-screen rejection)
- Adaptive Sampling (30-60fps based on movement)
- Calibration Validation (automatic quality checks)
- Periodic Recalibration (every 10 trials)
- Ridge Regression (improved head movement resistance)
- TFFacemesh Integration (468-point facial tracking)

## Updating Documentation

To update the documentation:

1. **Edit HTML files** in the `site/` directory
2. **Maintain consistent structure**:
   - Use Maven-style CSS classes
   - Follow existing method/property formatting
   - Include code examples with syntax highlighting
3. **Test locally** before pushing
4. **Push to main branch** for automatic deployment

## CSS Classes Reference

### Method Documentation
```html
<div class="method">
  <h3>methodName()</h3>
  <span class="badge badge-async">ASYNC</span>
  
  <div class="method-signature">
    async methodName(param: type): ReturnType
  </div>
  
  <div class="method-description">
    <p>Description here</p>
  </div>
  
  <div class="param-list">
    <h4>Parameters</h4>
    <div class="param-item">
      <span class="param-name">param</span>
      <span class="param-type">(type)</span>
      <p>Description</p>
    </div>
  </div>
</div>
```

### Badges
- `.badge-public` - Public method
- `.badge-private` - Private method
- `.badge-async` - Async method
- `.badge-static` - Static method
- `.badge-deprecated` - Deprecated

### Alerts
- `.alert-info` - Information
- `.alert-success` - Success message
- `.alert-warning` - Warning
- `.alert-danger` - Error/danger

## GitHub Actions Workflow

The deployment is handled by `.github/workflows/deploy-docs.yml`:

- **Trigger**: Push to main branch or manual dispatch
- **Process**: Uploads `site/` directory to GitHub Pages
- **Deploy**: Automatic via `actions/deploy-pages@v4`

## Browser Compatibility

Documentation tested and compatible with:
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

## License

Documentation and code are licensed under the Apache License, Version 2.0.

Copyright © 2026 Michael Ryan Hunsaker, M.Ed., Ph.D. All Rights Reserved.

## Contact

For issues or questions about the documentation:
- Email: hunsakerconsulting@gmail.com
- GitHub: https://github.com/mrhunsaker/GazeTracking

## Version History

- **2025.1.0** (January 26, 2026): Initial comprehensive API documentation
  - Complete method reference
  - Properties documentation
  - Quick start guide
  - Enhanced eye tracking features documented
  - Maven-style professional layout
