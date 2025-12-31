// Type declarations for GLSL file imports
// This allows TypeScript to understand .glsl?raw imports

declare module '*.glsl?raw' {
    const content: string;
    export default content;
}

declare module '*.glsl' {
    const content: string;
    export default content;
}

declare module '*.vert?raw' {
    const content: string;
    export default content;
}

declare module '*.frag?raw' {
    const content: string;
    export default content;
}

declare module '*.vert' {
    const content: string;
    export default content;
}

declare module '*.frag' {
    const content: string;
    export default content;
}
