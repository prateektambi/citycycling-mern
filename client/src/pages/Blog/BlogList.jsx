import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client, urlFor } from '../../sanityClient';
import { Calendar, User, ArrowRight, Loader, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import readingTime from 'reading-time/lib/reading-time';

const BlogList = () => {
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch categories
                const catQuery = `*[_type == "category"] | order(title asc) { title, "slug": slug.current }`;
                const cats = await client.fetch(catQuery);
                setCategories([{ title: 'All', slug: 'all' }, ...cats]);

                // Fetch posts with references resolved
                const postQuery = `*[_type == "post"] | order(publishedAt desc) {
                    title,
                    slug,
                    mainImage,
                    publishedAt,
                    excerpt,
                    body,
                    "authorName": author->name,
                    "authorImage": author->image,
                    "categories": categories[]->{title, "slug": slug.current}
                }`;
                const postData = await client.fetch(postQuery);

                // Calculate reading time for each post
                const processedPosts = postData.map(post => {
                    let textBody = '';
                    if (post.body) {
                        textBody = post.body
                            .filter(block => block._type === 'block' && block.children)
                            .map(block => block.children.map(child => child.text).join(''))
                            .join('\n');
                    }
                    const stats = readingTime(textBody);
                    return { ...post, readTime: Math.ceil(stats.minutes) };
                });

                setPosts(processedPosts);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch blog data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredPosts = activeCategory === 'All'
        ? posts
        : posts.filter(post => post.categories?.some(c => c.title === activeCategory));

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Stories...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-24 font-sans">
            <Helmet>
                <title>CityCycling Journal | Routes, Gear & Community Stories</title>
                <meta name="description" content="Discover the latest cycling events, gear reviews, maintenance tips, and incredible stories from the CityCycling community." />
                <meta property="og:title" content="CityCycling Journal" />
                <meta property="og:description" content="Discover the latest cycling events, gear reviews, maintenance tips, and incredible stories from the CityCycling community." />
                <meta property="og:type" content="website" />
            </Helmet>

            {/* Vibrant Hero Section */}
            <div className="relative bg-white overflow-hidden border-b border-gray-100">
                {/* Decorative background gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[70%] rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 blur-[80px] opacity-70"></div>
                    <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[60%] rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 blur-[80px] opacity-60"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 text-center relative z-10 space-y-6">
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 font-black tracking-widest text-xs uppercase shadow-sm border border-blue-100/50 mb-2">CityCycling Journal</span>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-none uppercase">
                        Stories from <br className="hidden md:block" /> the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Road</span>.
                    </h1>
                    <p className="text-gray-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Events, curated routes, gear reviews, and tales from our passionate community of riders.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-12 pb-20">
                {/* Category Filter Pills (Scrollable on mobile) */}
                {categories.length > 1 && (
                    <div className="flex overflow-x-auto pb-4 mb-12 hide-scrollbar gap-3 snap-x">
                        {categories.map((cat) => (
                            <button
                                key={cat.slug}
                                onClick={() => setActiveCategory(cat.title)}
                                className={`snap-center shrink-0 px-6 py-2.5 rounded-full text-sm font-bold tracking-wide uppercase transition-all duration-300 ${activeCategory === cat.title
                                        ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-105'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                                    }`}
                            >
                                {cat.title}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                    {filteredPosts.map((post) => (
                        <Link
                            to={`/blog/${post.slug.current}`}
                            key={post.slug.current}
                            className="group flex flex-col bg-white rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 border border-gray-100"
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                                {post.mainImage ? (
                                    <img
                                        src={urlFor(post.mainImage).width(800).url()}
                                        alt={post.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <span className="font-black text-xs uppercase tracking-widest">No Image</span>
                                    </div>
                                )}

                                {/* Category Badges on Image */}
                                {post.categories && post.categories.length > 0 && (
                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                        {post.categories.slice(0, 2).map(cat => (
                                            <span key={cat.slug} className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                                                {cat.title}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {post.readTime} min read</span>
                                </div>

                                <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase group-hover:text-blue-600 transition-colors mb-4">
                                    {post.title}
                                </h2>
                                <p className="text-gray-500 text-sm font-medium line-clamp-3 leading-relaxed mb-6">
                                    {post.excerpt}
                                </p>

                                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {post.authorImage ? (
                                            <img src={urlFor(post.authorImage).width(100).url()} alt={post.authorName} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-50" />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                                <User size={14} />
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{post.authorName}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
                                        <ArrowRight size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filteredPosts.length === 0 && !loading && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="text-gray-400" size={24} />
                        </div>
                        <p className="text-gray-900 font-black text-lg uppercase tracking-tight mb-2">No stories found</p>
                        <p className="text-gray-400 font-medium max-w-sm mx-auto">We couldn't find any articles in this category right now. Check back soon!</p>
                        {activeCategory !== 'All' && (
                            <button onClick={() => setActiveCategory('All')} className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">View All Stories</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogList;
