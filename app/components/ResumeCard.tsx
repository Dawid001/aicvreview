import {Link} from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";

interface ResumeCardProps {
  resume: Resume;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const ResumeCard = ({ resume, onDelete, isDeleting }: ResumeCardProps) => {
    const { id, companyName, jobTitle, feedback, imagePath } = resume;
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }
        loadResume();
    }, [imagePath]);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete && !isDeleting) onDelete();
    };

    const cardContent = (
        <>
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    <ScoreCircle score={feedback?.overallScore ?? 0} />
                </div>
            </div>
            {resumeUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                        />
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="resume-card-wrapper relative w-full lg:w-[450px] xl:w-[490px]">
            {onDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="absolute top-1.5 right-1.5 z-20 p-1 rounded-md bg-white/95 hover:bg-red-100 border border-gray-200 shadow-sm disabled:opacity-50 cursor-pointer"
                    title="Delete resume"
                    aria-label="Delete resume"
                >
                    <img src="/icons/cross.svg" alt="" className="w-3 h-3 pointer-events-none" />
                </button>
            )}
            <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000 block">
                {cardContent}
            </Link>
        </div>
    )
}
export default ResumeCard
