import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir todo excepto rutas que sabemos que son privadas y sensibles
    // Pero solo si no hay rastro de token
    const token = request.cookies.get('auth_token')?.value;

    // Si intenta ir a login ya estando logeado, mandarlo al inicio
    if (pathname === '/login' && token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // No expulsar de la raíz (/) desde el middleware para evitar falsos positivos
    // El ProtectedRoute en el cliente hará la validación final.

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
