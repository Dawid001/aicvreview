import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

type ResumeItem = { kvKey: string; resume: Resume };

export default function Home() {
  const { auth, kv, fs, puterReady } = usePuterStore();
  const navigate = useNavigate();
  const [resumeItems, setResumeItems] = useState<ResumeItem[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (!puterReady) return;
    const loadResumes = async () => {
      setLoadingResumes(true);
      setDeleteError(null);
      try {
        const list = (await kv.list('resume:*', true)) as KVItem[];
        const items: ResumeItem[] = (list ?? []).map((r) => {
          const resume = JSON.parse(r.value) as Resume;
          return {
            kvKey: r.key ?? `resume:${resume.id}`,
            resume,
          };
        });
        setResumeItems(items);
      } catch {
        setResumeItems([]);
      } finally {
        setLoadingResumes(false);
      }
    };
    loadResumes();
  }, [puterReady]);

  const deleteResume = async (item: ResumeItem) => {
    if (deletingId) return;
    setDeletingId(item.resume.id);
    setDeleteError(null);
    try {
      await kv.delete(item.kvKey);
      if (item.resume.resumePath) await fs.delete(item.resume.resumePath).catch(() => {});
      if (item.resume.imagePath) await fs.delete(item.resume.imagePath).catch(() => {});
      setResumeItems((prev) => prev.filter((i) => i.resume.id !== item.resume.id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed. Try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumeItems.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ) : (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {deleteError && (
        <div className="mx-4 mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {deleteError}
        </div>
      )}
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="" />
          </div>
      )}

      {!loadingResumes && resumeItems.length > 0 && (
        <div className="resumes-section">
          {resumeItems.map((item) => (
              <ResumeCard
                key={item.resume.id}
                resume={item.resume}
                onDelete={() => deleteResume(item)}
                isDeleting={deletingId === item.resume.id}
              />
          ))}
        </div>
      )}

      {!loadingResumes && resumeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}
