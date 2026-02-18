import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState, useRef} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, puterReady, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoadingResume, setIsLoadingResume] = useState(true);
    const objectUrlsRef = useRef<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading, auth.isAuthenticated, id, navigate]);

    useEffect(() => {
        if (!id || !puterReady) {
            if (puterReady && id) setIsLoadingResume(true);
            return;
        }

        const loadResume = async () => {
            setLoadError(null);
            try {
                const resume = await kv.get(`resume:${id}`);
                if (!resume) {
                    setLoadError('Resume not found. It may have expired or the link is invalid.');
                    setIsLoadingResume(false);
                    return;
                }

                const data = JSON.parse(resume);
                if (!data.resumePath || !data.imagePath) {
                    setLoadError('Invalid resume data.');
                    setIsLoadingResume(false);
                    return;
                }

                const resumeBlob = await fs.read(data.resumePath);
                if (!resumeBlob) {
                    setLoadError('Could not load resume file.');
                    setIsLoadingResume(false);
                    return;
                }
                const pdfBlob = resumeBlob instanceof Blob ? resumeBlob : new Blob([resumeBlob], { type: 'application/pdf' });
                const rUrl = URL.createObjectURL(pdfBlob);
                objectUrlsRef.current.push(rUrl);
                setResumeUrl(rUrl);

                const imageBlob = await fs.read(data.imagePath);
                if (!imageBlob) {
                    setLoadError('Could not load resume preview.');
                    setIsLoadingResume(false);
                    return;
                }
                const imgBlob = imageBlob instanceof Blob ? imageBlob : new Blob([imageBlob]);
                const iUrl = URL.createObjectURL(imgBlob);
                objectUrlsRef.current.push(iUrl);
                setImageUrl(iUrl);

                if (data.feedback && typeof data.feedback === 'object') {
                    setFeedback(data.feedback);
                } else {
                    setLoadError('No feedback data for this resume.');
                }
            } catch (err) {
                setLoadError(err instanceof Error ? err.message : 'Failed to load resume.');
            } finally {
                setIsLoadingResume(false);
            }
        };

        loadResume();
        return () => {
            objectUrlsRef.current.forEach(URL.revokeObjectURL);
            objectUrlsRef.current = [];
        };
    }, [id, puterReady]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {loadError && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-4 mt-4">
                            <p>{loadError}</p>
                            <Link to="/" className="text-sm font-semibold underline mt-2 inline-block">Back to Homepage</Link>
                        </div>
                    )}
                    {!loadError && feedback && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS?.score ?? 0} suggestions={feedback.ATS?.tips ?? []} />
                            <Details feedback={feedback} />
                        </div>
                    )}
                    {!loadError && !feedback && (
                        <img src="/images/resume-scan-2.gif" className="w-full" alt="Loading..." />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
