import React, { useEffect } from 'react'; // <--- Import useEffect
import { Link, useNavigate } from 'react-router-dom'; // <--- Import useNavigate
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Video, FileText, Code, ArrowRight, CheckCircle, Sparkles, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // <--- Import useAuth

const Landing = () => {
  const { user, loading } = useAuth(); // <--- Get auth state
  const navigate = useNavigate();

  // FIX: Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Optional: Show a loading spinner while checking auth status
  // This prevents the landing page from "flashing" before redirecting
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ... (Keep the rest of your existing animation variants and code below) ...
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };
  
  // ... rest of your component ...
  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const demoTestimonials = [
    // ... keep existing testimonials ...
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'CEO, TechStart',
      content: 'TrustFlow transformed how we collect testimonials. Our conversion rate increased by 40% after adding the Wall of Love to our website!',
      rating: 5,
      avatar: 'https://i.pravatar.cc/100?img=1'
    },
    // ... keep others ...
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Freelance Designer',
      content: 'As a freelancer, social proof is everything. TrustFlow makes it so easy to collect and showcase client reviews.',
      rating: 5,
      avatar: 'https://i.pravatar.cc/100?img=3'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'Marketing Director',
      content: 'The video testimonial feature is a game-changer. Authentic video reviews convert way better than text.',
      rating: 5,
      avatar: 'https://i.pravatar.cc/100?img=5'
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Agency Owner',
      content: 'We use TrustFlow for all our client projects. The embeddable widget is beautiful and super easy to customize.',
      rating: 5,
      avatar: 'https://i.pravatar.cc/100?img=8'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            TrustFlow
          </span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4"
        >
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
              Get Started Free
            </Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Social Proof on Autopilot
            </span>
          </motion.div>
          <motion.h1 
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-violet-800 to-indigo-900 dark:from-white dark:via-violet-200 dark:to-indigo-200 bg-clip-text text-transparent"
          >
            Collect & Display
            <br />
            <span className="text-violet-600">Beautiful Testimonials</span>
          </motion.h1>
          <motion.p 
            variants={fadeInUp}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Create dedicated spaces for your projects, send a simple link to clients, 
            and showcase stunning text & video testimonials on your website.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-lg px-8 py-6 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105 active:scale-95"
              >
                Start for Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              See Demo
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20">
       <div id="trustflow-widget"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">Three simple steps to social proof success</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { icon: FileText, title: 'Create a Space', desc: 'Set up a dedicated space for each project with your branding' },
            { icon: Video, title: 'Send the Link', desc: 'Share a unique link with clients to collect text or video testimonials' },
            { icon: Code, title: 'Embed Anywhere', desc: 'Add a beautiful Wall of Love widget to your website with one line of code' }
          ].map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="text-center p-8 h-full hover:shadow-xl transition-all hover:-translate-y-1 border-violet-100 dark:border-violet-900/50">
                <CardContent className="p-0">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/50 dark:to-indigo-900/50 rounded-2xl flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-violet-600" />
                  </div>
                  <div className="text-sm text-violet-600 font-semibold mb-2">Step {index + 1}</div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Demo Wall of Love */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Wall of Love</h2>
          <p className="text-muted-foreground text-lg">See what our users are saying about TrustFlow</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {demoTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-xl transition-all hover:-translate-y-1 border-violet-100 dark:border-violet-900/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-4 text-foreground/90">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-lg">Powerful features to collect and showcase social proof</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { title: 'Video Testimonials', desc: 'Let clients record video reviews directly in their browser' },
            { title: 'Customizable Forms', desc: 'Brand your collection forms with your logo and colors' },
            { title: 'One-Click Embed', desc: 'Add a beautiful Wall of Love widget to your website with one line of code' },
            { title: 'Star Ratings', desc: 'Collect 5-star ratings alongside testimonials' },
            { title: 'Moderation', desc: 'Approve which testimonials appear on your widget' },
            { title: 'Multiple Layouts', desc: 'Grid, masonry, or carousel - pick your style' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-6 rounded-xl bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 transition-colors"
            >
              <CheckCircle className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Boost Your Conversions?</h2>
          <p className="text-lg opacity-90 mb-8">Join thousands of businesses using TrustFlow to showcase their social proof.</p>
          <Link to="/signup">
            <Button 
              size="lg" 
              className="bg-white text-violet-600 hover:bg-gray-100 text-lg px-8 py-6 hover:scale-105 active:scale-95 transition-transform"
            >
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              TrustFlow
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 TrustFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;