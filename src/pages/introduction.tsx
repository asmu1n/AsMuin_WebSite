import { motion } from 'framer-motion';
import Layout from '@theme/Layout';
import style from '../css/pages/introduction.module.scss';
export default function Introduction() {
    const textContent =
        '欢迎来到三木树屋。这破地方最早就是几块木板硬拼上去的，能不塌已经算是奇迹。后来越折腾越上头，墙糊上了，屋顶盖上了，里面塞满了各种乱七八糟的东西——写到一半骂着放弃的笔记、拆得稀碎的代码、几个深不见底的坑，还有一些连我自己都不确定对不对的想法。---我对技术没什么忠诚度：前端、后端、网络、工具链，什么好玩就搞什么，搞不动了就换下一个。这个站点就是搞事过程中的残留物。---发现哪里写得有问题，邮箱砸过来就行。';
    const content = textContent.split('---').map((item, index) => {
        return (
            <motion.p
                initial={{ opacity: 0, x: -10, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 2 + index * 0.5 }}
                key={index}
                className={style.text}>
                {item}
            </motion.p>
        );
    });
    return (
        <Layout title="介绍" description="来自作者的一些话">
            {/* <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
                className="page-introduction"> */}
            <PageTitle />
            <motion.section className={style.content}>
                {content}
                {/* <p className="text">
                        Hello,I&apos;m AsMuin, a web developer and designer. I
                        love creating websites and designing user interfaces.
                    </p> */}
            </motion.section>
            {/* </motion.div> */}
            <PageEnd></PageEnd>
        </Layout>
    );
}
function PageTitle() {
    // const initMotion = {
    //     opacity: 0,
    //     scale: 0.8
    // };
    const animateMotion = {
        opacity: 1,
        scale: 1
    };
    return (
        <motion.h1 className={style['page-title']}>
            {/* <motion.span
                initial={initMotion}
                animate={animateMotion}
                transition={{ duration: 3 }}>
                作者
            </motion.span> */}
            <motion.span
                initial={{ opacity: 0 }}
                animate={animateMotion}
                transition={{ duration: 6 }}>
                留言板
            </motion.span>
        </motion.h1>
    );
}
function PageEnd() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 3 }}
            className={style['page-end']}>
            <h3 className={style.author}>作者：AsMuin</h3>
            <img
                className={style['page-end-img']}
                src={require('@site/static/img/happy-star.png').default}
                alt="happy meet you"
            />
        </motion.div>
    );
}
