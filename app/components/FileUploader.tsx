import {useState, useCallback} from 'react'
import {useDropzone} from 'react-dropzone'
import { formatSize } from '../lib/utils'

interface FileUploaderProps {
    onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
    const [file, setFile] = useState<File | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const droppedFile = acceptedFiles[0] || null;
        setFile(droppedFile);
        onFileSelect?.(droppedFile);
    }, [onFileSelect]);

    const handleRemoveFile = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFile(null);
        onFileSelect?.(null);
    }, [onFileSelect]);

    const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes

    const {getRootProps, getInputProps, isDragActive, isDragReject} = useDropzone({
        onDrop,
        multiple: false,
        accept: { 'application/pdf': ['.pdf']},
        maxSize: maxFileSize,
        noClick: false,
        noKeyboard: false,
    })

    return (
        <div className="w-full">
            <div 
                {...getRootProps()} 
                className={`gradient-border transition-all duration-200 cursor-pointer ${
                    isDragActive 
                        ? 'ring-4 ring-blue-400 ring-opacity-50 bg-blue-50 scale-[1.02]' 
                        : isDragReject 
                        ? 'ring-4 ring-red-400 ring-opacity-50 bg-red-50' 
                        : ''
                }`}
            >
                <input {...getInputProps()} />

                <div className="space-y-4">
                    {file ? (
                        <div className="uploader-selected-file" onClick={(e) => e.stopPropagation()}>
                            <img src="/images/pdf.png" alt="pdf" className="size-10" />
                            <div className="flex items-center space-x-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="p-2 cursor-pointer hover:bg-gray-100 rounded transition-colors"
                                onClick={handleRemoveFile}
                                title="Remove file"
                            >
                                <img src="/icons/cross.svg" alt="Remove" className="w-4 h-4" />
                            </button>
                        </div>
                    ): (
                        <div className="py-8">
                            <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">
                                <img src="/icons/info.svg" alt="upload" className="size-20" />
                            </div>
                            {isDragActive ? (
                                <>
                                    <p className="text-lg font-semibold text-blue-600">
                                        Drop your PDF here
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">Release to upload</p>
                                </>
                            ) : isDragReject ? (
                                <>
                                    <p className="text-lg font-semibold text-red-600">
                                        Invalid file type
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">Only PDF files are accepted</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg text-gray-500">
                                        <span className="font-semibold">
                                            Click to upload
                                        </span> or drag and drop
                                    </p>
                                    <p className="text-lg text-gray-500">PDF (max {formatSize(maxFileSize)})</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default FileUploader
