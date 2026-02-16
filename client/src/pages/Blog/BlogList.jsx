import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client, urlFor } from '../../sanityClient';
import { Calendar, User, ArrowRight, Loader } from 'lucide-react';

const BlogList = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const query = `*[_type == "post"] | order(publishedAt desc) {
                    title,
                    slug,
                    mainImage,
                    publishedAt,
                    excerpt,
                    "authorName": author->name,
                    "authorImage": author->image
                }`;
                const data = await client.fetch(query);
                setPosts(data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch blog posts:", error);
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Stories...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Minimal Hero */}
            <div className="bg-gray-50 border-b border-gray-100/50">
                <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center space-y-4">
                    <span className="text-blue-600 font-black tracking-widest text-xs uppercase">CityCycling Journal</span>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight uppercase">
                        Stories from <br/> the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Road</span>.
                    </h1>
                    <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto">
                        Tips, routes, and tales from our community of riders.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {posts.map((post) => (
                        <Link 
                            to={`/blog/${post.slug.current}`} 
                            key={post.slug.current}
                            className="group flex flex-col bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all duration-500"
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                                {post.mainImage ? (
                                    <img 
                                        src={urlFor(post.mainImage).width(800).url()} 
                                        alt={post.title} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <span className="font-black text-xs uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/50 text-gray-900">
                                    {new Date(post.publishedAt).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <div className="p-8 flex flex-col flex-1 gap-4">
                                <h2 className="text-xl font-black text-gray-900 leading-tight uppercase group-hover:text-blue-600 transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-gray-500 text-sm font-medium line-clamp-3 leading-relaxed">
                                    {post.excerpt}
                                </p>
                                
                                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {post.authorImage ? (
                                            <img src={urlFor(post.authorImage).width(100).url()} alt={post.authorName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"/>
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                <User size={14}/>
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{post.authorName}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {posts.length === 0 && !loading && (
                   <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest">No articles found just yet.</p>
                   </div>
                )}
            </div>
        </div>
    );
};

export default BlogList;
