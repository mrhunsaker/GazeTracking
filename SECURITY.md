# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 2025.1.0+ | :white_check_mark: |
| 2024.0.1   | :white_check_mark: |
| < 2024.0.1 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please follow these steps:

1. **Do not** open an issue on GitHub.
2. Send an email to [hunsakerconsulting@gmail.com](mailto:hunsakerconsultign@gmail.com) with the details of the vulnerability.
3. Include the following information in your email:
   - A description of the vulnerability.
   - Steps to reproduce the vulnerability.
   - Any potential impact or exploit scenarios.
   - Your contact information.

We will respond to your report within 72 hours with an acknowledgment and will work with you to understand and resolve the issue as quickly as possible.

## Security Best Practices

To ensure the security of your deployment, please follow these best practices:

### General Security
- **Keep Dependencies Updated**: Regularly update your dependencies to the latest versions to ensure you have the latest security patches.
- **Use HTTPS**: Always use HTTPS to encrypt data in transit. This is **required** for webcam access.
- **Environment Variables**: Store sensitive information such as API keys and database credentials in environment variables, not in your codebase.
- **Access Control**: Implement proper access control mechanisms to restrict access to sensitive parts of your application.
- **Regular Audits**: Conduct regular security audits and code reviews to identify and fix potential vulnerabilities.
## Known Security Considerations

### Browser-Based Limitations
- **Client-Side Validation**: All gaze tracking occurs in the browser. Malicious users could:
  - Modify JavaScript code to alter data collection
  - Bypass calibration requirements
  - Inject fabricated gaze data
  - **Mitigation**: This is acceptable for research purposes where participants are cooperative. For high-stakes applications, implement server-side validation.

### TensorFlow.js and WebGazer.js
- **Model Security**: The system uses pre-trained TensorFlow.js models:
  - Models are loaded from CDN (potential supply chain risk)
  - **Mitigation**: Use Subresource Integrity (SRI) hashes to verify model files
  - Consider hosting models locally for sensitive deployments
- **WebGazer Updates**: WebGazer.js is actively maintained:
  - Subscribe to security advisories from the WebGazer.js project
  - Test updates in a staging environment before production deployment

### Third-Party Dependencies
Current critical dependencies that require security monitoring:
- `webgazer.js` - Eye tracking library
- `tensorflow.js` - Machine learning framework
- `localforage` - Client-side storage wrapper
- `http-server` - Development web server

Regularly audit dependencies using:
```bash
npm audit
npm audit fix
```

## Security Updates and Patches

### Recent Security Enhancements (2025.1.0)
- **Outlier Detection**: Added validation to reject suspicious gaze points >500px jumps
- **Calibration Validation**: Automatic quality checks prevent poor calibration from affecting results
- **Data Integrity**: Enhanced metadata tracking for audit trails
- **Head Pose Security**: Baseline tracking prevents manipulation of head movement compensation

### Patch Policy
- **Critical Vulnerabilities**: Patched within 48 hours
- **High Severity**: Patched within 1 week
- **Medium Severity**: Patched in next minor release
- **Low Severity**: Patched in next major release

## Contact

For any security-related inquiries, please contact [hunsakerconsulting@gmail.com](mailto:hunsakerconsulting@gmail.com).

**Note**: There is a typo in the email links throughout this document. Please use the correct email address shown above.
  - Obtain explicit informed consent from participants before starting experiments
  - Display clear visual indicators when the webcam is active
  - Never transmit webcam frames to external servers
  - Process all gaze tracking locally in the browser
- **SSL/TLS Required**: Modern browsers require HTTPS for webcam API access. Generate self-signed certificates for local development:
  ```bash
  openssl req -nodes -new -x509 -keyout server.key -out server.cert
  ```
- **Camera Permissions**: Users must explicitly grant camera permissions. Implement proper error handling for denied permissions.
- **Privacy by Design**: The WebGazer.js implementation processes video frames locally using TensorFlow.js without uploading any visual data.

### Data Handling Security
- **Local Storage**: Experiment data is stored locally using localForage. Ensure:
  - Data is only accessible within the same origin
  - Clear data after secure export/transfer
  - Use IndexedDB quotas appropriately
- **Data Minimization**: Only collect necessary data points:
  - Gaze coordinates (x, y)
  - Timestamps
  - Trial metadata
  - Head pose parameters (when needed)
- **Participant Anonymization**: Use anonymous participant IDs, never store personally identifiable information (PII)
- **Data Export**: When exporting data:
  - Use secure transfer methods (encrypted file transfer, secure cloud storage)
  - Validate data integrity with checksums
  - Delete local copies after successful export

### Eye Tracking Implementation Security
- **Outlier Detection**: The enhanced system includes outlier rejection to prevent:
  - Injection of malicious data points
  - Calibration manipulation attempts
  - Invalid gaze coordinates that could affect results
- **Kalman Filtering**: Smoothing parameters are fixed to prevent:
  - Parameter manipulation that could hide legitimate data
  - Overfitting that reduces data quality
- **Head Pose Compensation**: Baseline measurements prevent:
  - Fabricated head movement data
  - Manipulation of compensation algorithms

### Server Security
- **http-server Configuration**: When running the local server:
  - Bind to localhost only unless network access is required
  - Use strong SSL certificates in production
  - Disable directory listing: `http-server -S -C server.cert -K server.key --no-dotfiles`
  - Set appropriate CORS headers if needed
- **Port Management**: Use non-privileged ports (>1024) to avoid requiring root access
- **Firewall Rules**: Configure firewall to restrict access to the experiment server

### Institutional Review Board (IRB) Compliance
- **Informed Consent**: Implement proper consent collection mechanisms before data collection
- **Data Retention**: Follow institutional policies for data retention and destruction
- **Audit Trails**: Maintain logs of:
  - When experiments were conducted
  - Participant consent timestamps
  - Data access and export events
- **Secure Storage**: Store consent forms and sensitive documents separately from experimental data

## Contact

For any security-related inquiries, please contact [hunsakerconsulting@gmail.com](mailto:hunsakerconsultign@gmail.com).

Thank you for helping to keep our project secure!
