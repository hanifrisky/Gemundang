'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { AnyGemUndangProject } from '@/types';
import { getProjectForEdit, saveProject } from '@/lib/projectStorage';
import { getThemeDefinition } from '@/themes/registry';
import AccessNotice from '@/components/auth/AccessNotice';

function EditorRouteContent() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [project, setProject] = useState<AnyGemUndangProject | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [accessError, setAccessError] = useState<'unauthenticated' | 'forbidden' | 'not_found' | null>(null);

  const loadProject = React.useCallback(async () => {
    try {
      const res = await getProjectForEdit(slug);
      if (res.status === 'ok') {
        setProject(res.project);
        setCurrentVersion(res.currentVersion);
      } else {
        setAccessError(res.status);
      }
    } catch (err) {
      console.error('Gagal memuat projek:', err);
    }
  }, [slug]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (accessError) return <AccessNotice status={accessError} />;

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Memuat Editor GemUndang...
      </div>
    );
  }

  const themeDef = getThemeDefinition(project.theme_type);
  const EditorComponent = themeDef.EditorComponent;

  return (
    <EditorComponent
      project={project}
      currentVersion={currentVersion}
      onReload={loadProject}
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

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          Memuat Editor GemUndang...
        </div>
      }
    >
      <EditorRouteContent />
    </Suspense>
  );
}
