'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { AnyGemUndangProject } from '@/types';
import { getProjectForEdit, saveProject } from '@/lib/projectStorage';
import { getThemeDefinition } from '@/themes/registry';
import AccessNotice from '@/components/auth/AccessNotice';

function TemplateRouteContent() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [project, setProject] = useState<AnyGemUndangProject | null>(null);
  const [accessError, setAccessError] = useState<'unauthenticated' | 'forbidden' | 'not_found' | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectForEdit(slug)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'ok') setProject(res.project);
        else setAccessError(res.status);
      })
      .catch((err) => console.error('Gagal memuat template projek:', err));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (accessError) return <AccessNotice status={accessError} />;

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Memuat Form Template GemUndang...
      </div>
    );
  }

  const themeDef = getThemeDefinition(project.theme_type);
  const TemplateComponent = themeDef.TemplateComponent;

  return (
    <TemplateComponent
      project={project}
      onSave={async (updated: AnyGemUndangProject) => {
        const ok = await saveProject(updated);
        if (ok) {
          setProject(updated);
        }
        return ok;
      }}
    />
  );
}

export default function TemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          Memuat Form Template GemUndang...
        </div>
      }
    >
      <TemplateRouteContent />
    </Suspense>
  );
}
