<template>
  <section class="mx-auto max-w-3xl space-y-8">
    <header class="fade-rise">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <div>
          <h1 class="font-serif text-2xl font-bold text-slate-900">开放评审</h1>
          <p class="text-sm text-slate-500">了解我们的开放评审模式</p>
        </div>
      </div>
    </header>

    <article class="card-surface prose-content p-8 fade-rise fade-rise-delay-1">
      <h2>什么是开放评审？</h2>
      <p>
        开放评审（Open Review）是一种透明的学术评审模式。与传统的匿名评审不同，
        开放评审允许评审过程对所有参与者可见，包括作者、评审人和更广泛的学术社区。
      </p>

      <h2>我们的评审流程</h2>
      <ol>
        <li><strong>投稿提交</strong> - 作者提交稿件，包括标题、摘要、正文和关键词</li>
        <li><strong>开放讨论</strong> - 社区成员可以对稿件发表评论和提问</li>
        <li><strong>专家评审</strong> - 受邀评审人对稿件进行详细评审</li>
        <li><strong>作者回复</strong> - 作者可以回复评审意见并修改稿件</li>
        <li><strong>编辑决定</strong> - 编辑根据评审意见做出最终决定</li>
      </ol>

      <h2>开放评审的优势</h2>
      <ul>
        <li><strong>透明度</strong> - 评审过程公开透明，可追溯</li>
        <li><strong>问责制</strong> - 评审人对其意见负责</li>
        <li><strong>协作</strong> - 促进作者、评审人和社区之间的建设性对话</li>
        <li><strong>学习</strong> - 新研究者可以观察和学习评审过程</li>
        <li><strong>效率</strong> - 减少重复评审，加快知识传播</li>
      </ul>

      <h2>评审标准</h2>
      <p>评审人将根据以下标准评估稿件：</p>
      <ul>
        <li><strong>原创性</strong> - 研究的新颖性和创新性</li>
        <li><strong>严谨性</strong> - 方法论的科学性和准确性</li>
        <li><strong>清晰度</strong> - 表达是否清晰易懂</li>
        <li><strong>相关性</strong> - 对领域的重要性和贡献</li>
        <li><strong>完整性</strong> - 研究是否完整，证据是否充分</li>
      </ul>

      <h2>参与方式</h2>
      <p>
        任何人都可以注册账号参与开放评审。您可以作为作者投稿、
        作为评审人参与审稿，或作为社区成员发表评论。
      </p>

      <div class="mt-8 flex flex-wrap gap-4">
        <router-link to="/submit" class="btn-primary"> 开始投稿 </router-link>
        <router-link to="/guidelines" class="btn-secondary"> 查看投稿指南 </router-link>
      </div>
    </article>
  </section>
</template>
