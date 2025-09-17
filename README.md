# SSL/TLS Certificate Viewer

A modern, responsive web application for viewing and analyzing SSL/TLS certificates. Built with Next.js 15 and featuring a clean, intuitive interface with dark/light theme support.

![Certificate Viewer](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 📁 **Multiple Input Methods**

- **File Upload**: Drag & drop or browse for `.crt` and `.pem` files
- **Text Input**: Paste raw certificate text directly
- **URL Fetching**: Retrieve certificate information from any domain using ssl-checker.io API

### 🔍 **Comprehensive Certificate Analysis**

- **Basic Information**: Subject, Issuer, Validity Period, Serial Number
- **Public Key Details**: Algorithm, Key Size, Modulus, Exponent
- **Extensions**: Key Usage, Basic Constraints, Extended Key Usage
- **Certificate Transparency**: SCT (Signed Certificate Timestamp) details
- **Fingerprints**: SHA-1 and SHA-256 hashes
- **Raw View**: Complete certificate text with syntax highlighting

### 🎨 **Modern UI/UX**

- **Responsive Design**: Mobile-first approach with elegant desktop layout
- **Dark/Light Theme**: Automatic system preference detection with manual toggle
- **Search Functionality**: Find specific certificate properties quickly
- **Copy to Clipboard**: Easy sharing of certificate data
- **Professional Styling**: Clean, modern interface with Tailwind CSS

### 🔒 **Privacy & Security**

- **Client-Side Processing**: All certificate parsing happens in your browser
- **No Data Storage**: No certificate information is sent to or stored on our servers
- **CORS Proxy**: Secure API calls through allorigins.win for URL fetching

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/cert-view.git
   cd ssl-tls-certificate-viewer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Upload Certificate Files

1. Drag and drop a `.crt` or `.pem` file onto the upload area
2. Or click "Browse Files" to select a certificate file
3. View detailed certificate information in the structured format

### Paste Certificate Text

1. Click "Paste Certificate Text"
2. Paste your certificate content (PEM format)
3. Click "Parse Certificate" to analyze

### Fetch from URL

1. Enter a domain name (e.g., `google.com`, `github.com`)
2. Click "Fetch Certificate"
3. View the raw API response from ssl-checker.io

### Search Certificate Details

- Use the search bar to find specific properties
- Search works across property names and values
- Results are highlighted for easy identification

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Certificate Parsing**: [node-forge](https://github.com/digitalbazaar/forge)
- **Syntax Highlighting**: [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)
- **Theme Management**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles and Tailwind configuration
│   ├── layout.tsx           # Root layout with theme provider
│   └── page.tsx             # Main application page
├── components/
│   ├── CertificateDetails.tsx    # Certificate information display
│   ├── CertificateRawView.tsx    # Raw certificate text viewer
│   └── CertificateUpload.tsx     # File upload and input components
└── lib/
    ├── cert-api-parser.ts        # URL fetching functionality
    └── certificate-parser.ts     # Certificate parsing logic
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

## 🌐 API Integration

The application integrates with [ssl-checker.io](https://ssl-checker.io/) API for fetching certificate information from URLs:

- **Endpoint**: `https://ssl-checker.io/api/v1/check/{domain}`
- **CORS Proxy**: Uses `https://api.allorigins.win/` for cross-origin requests
- **Response Format**: Raw JSON response displayed in the application

## 🎨 Theme Support

The application supports both light and dark themes:

- **Automatic Detection**: Follows system preference by default
- **Manual Toggle**: Theme switcher in the header
- **Persistent**: Theme preference is saved in localStorage
- **Smooth Transitions**: Animated theme changes

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Responsive design for all screen sizes
- **Touch Friendly**: Large touch targets and intuitive gestures
- **Accessibility**: WCAG compliant with proper contrast ratios

## 🔒 Security Considerations

- **Client-Side Only**: No server-side certificate processing
- **No Data Persistence**: Certificates are not stored or transmitted
- **Secure APIs**: All external API calls use HTTPS
- **Input Validation**: Proper validation of certificate formats

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [node-forge](https://github.com/digitalbazaar/forge) for certificate parsing
- [ssl-checker.io](https://ssl-checker.io/) for certificate API
- [allorigins.win](https://allorigins.win/) for CORS proxy
- [Lucide](https://lucide.dev/) for beautiful icons

## 📞 Support

If you encounter any issues or have questions:

- 🐛 **Bug Reports**: [Open an issue](https://github.com/nasraldin/ssl-tls-certificate-viewer/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/nasraldin/ssl-tls-certificate-viewer/discussions)
- 📧 **Contact**: [https://nasraldin.com](https://nasraldin.com)

---

**Made with ❤️ for the security community**
