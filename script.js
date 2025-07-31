// script.js

// 1. Supabase 客户端初始化
// 警告：请务必替换为你的 Supabase 项目 URL 和 Anon Key
const SUPABASE_URL = 'https://uogpkhdjpkehrrembltf.supabase.co'; // 例如：'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2BWlIZrsmaAfRq9euaG38w_eQiQD6TA'; // 例如：'ey...'

// 检查占位符是否已被替换
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('重要提醒：请在 script.js 文件中设置你的 Supabase URL 和 Anon Key！');
}

const supabase = supabase_createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// 2. DOM 元素引用
const classesList = document.getElementById('classes-list');
const classSelect = document.getElementById('class-select');
const bookingForm = document.getElementById('booking-form');
const memberNameInput = document.getElementById('member-name');
const messageFeedback = document.getElementById('message-feedback');
const submitButton = document.getElementById('submit-button');


// 3. 核心函数

/**
 * 获取所有课程及其预约数量，并更新 UI
 */
async function fetchAndDisplayClasses() {
    // 显示加载状态
    classesList.innerHTML = '正在加载课程...';
    classesList.classList.add('loading');

    try {
        // 使用 Promise.all 并行获取课程和预约数据，提高效率
        const [{ data: classes, error: classesError }, { data: bookings, error: bookingsError }] = await Promise.all([
            supabase.from('classes').select('*').order('class_time', { ascending: true }),
            supabase.from('bookings').select('class_id')
        ]);

        if (classesError) throw classesError;
        if (bookingsError) throw bookingsError;

        // 计算每个课程的预约数
        const bookingCounts = bookings.reduce((acc, booking) => {
            acc[booking.class_id] = (acc[booking.class_id] || 0) + 1;
            return acc;
        }, {});

        // 清空现有列表和下拉菜单
        classesList.innerHTML = '';
        classesList.classList.remove('loading');
        classSelect.innerHTML = '<option value="">请选择一门课程</option>';

        if (classes.length === 0) {
            classesList.innerHTML = '当前没有可用的课程。';
            return;
        }

        // 遍历课程数据，生成 HTML
        classes.forEach(cls => {
            const bookedCount = bookingCounts[cls.id] || 0;
            const remainingSpots = cls.capacity - bookedCount;
            const isFull = remainingSpots <= 0;

            // 格式化时间 (例如: 8月15日 09:00)
            const classTime = new Date(cls.class_time);
            const formattedTime = `${classTime.getMonth() + 1}月${classTime.getDate()}日 ${classTime.getHours().toString().padStart(2, '0')}:${classTime.getMinutes().toString().padStart(2, '0')}`;
            
            // 创建课程卡片
            const card = document.createElement('div');
            card.className = 'class-card';
            card.innerHTML = `
                <h3>${cls.name}</h3>
                <p>时间: ${formattedTime}</p>
                <p>总名额: ${cls.capacity}</p>
                <p class="spots ${isFull ? 'full' : 'available'}">
                    剩余名额: ${remainingSpots}
                </p>
            `;
            classesList.appendChild(card);
            
            // 填充预约表单的下拉选项
            if (!isFull) {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = `${cls.name} (${formattedTime})`;
                classSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('获取课程失败:', error);
        classesList.innerHTML = '无法加载课程。请检查网络连接或联系管理员。';
    }
}

/**
 * 处理预约表单提交
 * @param {Event} e - 表单提交事件
 */
async function handleBooking(e) {
    e.preventDefault(); // 阻止表单默认提交行为

    const classId = classSelect.value;
    const memberName = memberNameInput.value.trim();

    // 简单的客户端验证
    if (!classId || !memberName) {
        displayMessage('请选择课程并输入您的姓名。', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = '正在提交...';

    try {
        // 在插入前再次检查剩余名额 (防止并发问题)
        const { data: bookings, error: countError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('class_id', classId);
        
        if(countError) throw countError;
        
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('capacity')
            .eq('id', classId)
            .single();
            
        if(classError) throw classError;
        
        if (bookings.length >= classData.capacity) {
            throw new Error('抱歉，该课程已满员！');
        }

        // 插入新的预约记录
        const { error: insertError } = await supabase
            .from('bookings')
            .insert([{ class_id: classId, member_name: memberName }]);

        if (insertError) {
            throw insertError;
        }
        
        // 预约成功
        displayMessage('恭喜您，预约成功！', 'success');
        bookingForm.reset(); // 清空表单
        
        // 重新加载课程数据以更新 UI
        fetchAndDisplayClasses();

    } catch (error) {
        console.error('预约失败:', error);
        displayMessage(`预约失败: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '确认预约';
    }
}

/**
 * 在页面上显示反馈信息
 * @param {string} text - 要显示的消息文本
 * @param {'success' | 'error'} type - 消息类型
 */
function displayMessage(text, type) {
    messageFeedback.textContent = text;
    messageFeedback.className = type; // 'success' or 'error'
    
    // 5秒后自动隐藏消息
    setTimeout(() => {
        messageFeedback.className = '';
        messageFeedback.textContent = '';
    }, 5000);
}

// 4. 事件监听器

// 页面加载完成后，立即获取课程数据
document.addEventListener('DOMContentLoaded', fetchAndDisplayClasses);

// 监听表单提交事件
bookingForm.addEventListener('submit', handleBooking);
