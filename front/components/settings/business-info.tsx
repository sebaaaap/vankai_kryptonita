"use client";

import { useState } from 'react';
import { MapPin, Phone, Mail, Building2, FileText, Globe } from 'lucide-react';

export function BusinessInfo() {
    const [formData, setFormData] = useState({
        businessName: 'Mi Lubricentro',
        businessType: 'lubricentro',
        phone: '+56 9 1234 5678',
        email: 'contacto@lubricentro.com',
        address: 'Calle Principal 123, Santiago',
        taxId: '12.345.678-9',
        currency: 'CLP',
    });

    const [saved, setSaved] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const businessTypes = [
        { value: 'lubricentro', label: 'Lubricentro' },
        { value: 'taller', label: 'Taller Mecánico' },
        { value: 'vulcanizacion', label: 'Vulcanización' },
        { value: 'mixto', label: 'Mixto (Lubricentro + Taller)' },
    ];

    const currencies = [
        { value: 'USD', label: 'USD - Dólar' },
        { value: 'MXN', label: 'MXN - Peso Mexicano' },
        { value: 'CLP', label: 'CLP - Peso Chileno' },
        { value: 'COP', label: 'COP - Peso Colombiano' },
        { value: 'PEN', label: 'PEN - Sol Peruano' },
        { value: 'ARS', label: 'ARS - Peso Argentino' },
        { value: 'EUR', label: 'EUR - Euro' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Nombre del Negocio
                    </label>
                    <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Mi Lubricentro"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Tipo de Negocio
                    </label>
                    <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        className="form-input"
                    >
                        {businessTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="+56 9 1234 5678"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        Correo Electrónico
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="contacto@negocio.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        RFC / RUC / NIT / RUT
                    </label>
                    <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="12.345.678-9"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Moneda Base
                    </label>
                    <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="form-input"
                    >
                        {currencies.map((curr) => (
                            <option key={curr.value} value={curr.value}>
                                {curr.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Dirección Comercial
                </label>
                <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Calle Principal 123, Ciudad, Provincia"
                />
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t border-border">
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold
            hover:bg-muted transition-all"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold
            hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    {saved ? (
                        <>
                            <span className="w-4 h-4">✓</span>
                            Guardado
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </button>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Nota:</strong> Estos datos se utilizarán para la generación de facturas, reportes y correos automáticos a clientes. Asegúrate de que la información fiscal sea correcta.
                </p>
            </div>
        </div>
    );
}
