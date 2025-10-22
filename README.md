# LaTeX Annotator Studio

Professional LaTeX editor with inline annotations, real-time rendering, and collaborative commenting features.

## Features

✨ **Real-time LaTeX Rendering**
- Inline math with `\( \)` or custom `( )` syntax
- Display math with `\[ \]`
- Automatic LaTeX detection for commands and expressions

📝 **Annotation System**
- Highlight any text in the preview
- Add structured annotations (VOQ, Strength, Improvement, Other)
- Persistent storage with localStorage
- Interactive highlights linking to comments

🎨 **Modern UI**
- Clean, responsive design
- Syntax highlighting in editor
- Beautiful math rendering with KaTeX
- Dark mode support

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:8080 in your browser.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository at [vercel.com/new](https://vercel.com/new)
3. Click Deploy - Vercel auto-detects Vite configuration
4. Your app will be live with automatic deployments on every push!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Usage

1. **Write LaTeX** in the editor with markdown formatting
2. **Preview** renders in real-time with beautiful typography
3. **Select text** in the preview to add annotations
4. **Click the + button** to create a new annotation
5. **Fill in details** based on annotation type
6. **Annotations persist** across sessions via localStorage

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **KaTeX** - LaTeX rendering
- **Lucide** - Icons

## Project Structure

```
src/
├── components/
│   ├── LatexEditor.tsx         # Main editor component
│   ├── CommentsSidebar.tsx     # Annotations panel
│   ├── AddAnnotationButton.tsx # Floating add button
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── latex-renderer.ts       # LaTeX processing & highlighting
│   └── utils.ts                # Utility functions
└── types/
    └── comment.ts              # TypeScript interfaces
```

## License

MIT

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.
