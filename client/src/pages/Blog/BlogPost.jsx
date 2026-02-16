import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '../../sanityClient';
import { PortableText } from '@portabletext/react';
import { ArrowLeft, User, Calendar, Clock, Loader } from 'lucide-react';

const BlogPost = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    const ptComponents = {
        types: {
            image: ({ value }) => {
                if (!value?.asset?._ref) {
                    return null;
                }
                return (
                    <img
                        src={urlFor(value).fit('max').auto('format').url()}
                        alt={value.alt || ' '}
                        className="rounded-2xl my-8 w-full object-cover max-h-[600px] shadow-lg"
                    />
                );
            }
        },
        block: {
            h1: ({children}) => <h1 className="text-3xl font-black text-gray-900 mt-10 mb-4">{children}</h1>,
            h2: ({children}) => <h2 className="text-2xl font-black text-gray-900 mt-8 mb-4">{children}</h2>,
            h3: ({children}) => <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{children}</h3>,
            normal: ({children}) => <p className="mb-4 text-gray-600 leading-relaxed text-lg font-medium">{children}</p>,
            blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-6 text-gray-700 italic font-medium bg-gray-50 rounded-r-lg">{children}</blockquote>,
        },
        list: {
            bullet: ({children}) => <ul className="list-disc pl-5 mb-4 space-y-2 text-gray-600 font-medium">{children}</ul>,
            number: ({children}) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-gray-600 font-medium">{children}</ol>,
        },
    };

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const query = `*[slug.current == $slug][0]{
                    title,
                    slug,
                    mainImage,
                    publishedAt,
                    body,
                    "authorName": author->name,
                    "authorImage": author->image,
                    "authorBio": author->bio
                }`;
                const data = await client.fetch(query, { slug });
                setPost(data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch blog post:", error);
                setLoading(false);
            }
        };

        fetchPost();
    }, [slug]);

    if (loading) return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="animate-spin text-blue-600" size={48} />
                    <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Article...</p>
                </div>
            </div>
        );

    if (!post) return <div className="p-20 text-center font-bold text-gray-500">Post not found</div>;

    return (
        <div className="bg-white min-h-screen pb-20">
             {/* Header / Breadcrumb */}
             <div className="bg-white/50 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/blog" className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-colors">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Journal
                    </Link>
                </div>
            </div>

            <article className="max-w-4xl mx-auto px-6 pt-10">
                {/* Article Header */}
                <div className="space-y-6 mb-10 text-center max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.publishedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-blue-600">Article</span>
                    </div>
                   
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.05] uppercase">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-center gap-3 pt-4">
                        {post.authorImage ? (
                            <img src={urlFor(post.authorImage).width(100).url()} alt={post.authorName} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"/>
                        ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <User size={18}/>
                            </div>
                        )}
                        <div className="text-left">
                            <p className="text-xs font-black text-gray-900 uppercase tracking-wide">{post.authorName}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Editor</p>
                        </div>
                    </div>
                </div>

                {/* Hero Image */}
                {post.mainImage && (
                    <div className="mb-12 rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200">
                        <img 
                            src={urlFor(post.mainImage).width(1200).url()} 
                            alt={post.title} 
                            className="w-full object-cover aspect-video"
                        />
                    </div>
                )}

                {/* Content Body */}
                <div className="prose prose-lg prose-blue max-w-none prose-headings:font-black prose-headings:uppercase prose-p:font-medium prose-p:text-gray-600 prose-img:rounded-2xl">
                    <PortableText value={post.body} components={ptComponents} />
                </div>

                {/* Author Bio Section */}
                <div className="mt-20 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                     {post.authorImage && (
                        <div className="shrink-0">
                            <img src={urlFor(post.authorImage).width(200).url()} alt={post.authorName} className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"/>
                        </div>
                    )}
                    <div>
                        <h4 className="font-black text-gray-900 uppercase tracking-wide mb-2">About {post.authorName}</h4>
                         {/* Render bio if available, simplified for now */}
                         <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-lg">
                            An avid cyclist and storyteller sharing their adventures on two wheels.
                         </p>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default BlogPost;
