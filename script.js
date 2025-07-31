// script.js (FINAL CORRECTED VERSION)

// 1. Supabase 客户端初始化
// 警告：请务必替换为你的 Supabase 项目 URL 和 Anon Key
const SUPABASE_URL = 'https://uogpkhdjpkehrrembltf.supabase.co'; // 例如：'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2BWlIZrsmaAfRq9euaG38w_eQiQD6TA'; // 例如：'ey...'

// 检查占位符是否已被替换
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('重要提醒：请在 script.js 文件中设置你的 Supabase URL 和 Anon Key！');
}

// *** 这是最终修正后的行 ***
// 使用不同的变量名来避免初始化冲突，并调用全局的 supabase 对象
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    classesList.innerHTML = '正在加载课程...';
    classesList.classList.add('loading');

    try {
        const [{ data: classes, error: classesError }, { data: bookings, error: bookingsError }] = await Promise.all([
            // *** 修改: 使用 supabaseClient ***
            supabaseClient.from('classes').select('*').order('class_time', { ascending: true }),
            // *** 修改: 使用 supabaseClient ***
            supabaseClient.from('bookings').select('class_id')
        ]);

        if (classesError) throw classesError;
        if (bookingsError) throw bookingsError;

        const bookingCounts = bookings.reduce((acc, booking) => {
            acc[booking.class_id] = (acc[booking.class_id] || 0) + 1;
            return acc;
        }, {});

        classesList.innerHTML = '';
        classesList.classList.remove('loading');
        classSelect.innerHTML = '<option value="">请选择一门课程</option>';

        if (classes.length === 0) {
            classesList.innerHTML = '当前没有可用的课程。';
            return;
        }

        classes.forEach(cls => {
            const bookedCount = bookingCounts[cls.id] || 0;
            const remainingSpots = cls.capacity - bookedCount;
            const isFull = remainingSpots <= 0;

            const classTime = new Date(cls.class_time);
            const formattedTime = `${classTime.getMonth() + 1}月${classTime.getDate()}日 ${classTime.getHours().toString().padStart(2, '0')}:${classTime.getMinutes().toString().padStart(2, '0')}`;
            
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
    e.preventDefault();

    const classId = classSelect.value;
    const memberName = memberNameInput.value.trim();

    if (!classId || !memberName) {
        displayMessage('请选择课程并输入您的姓名。', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = '正在提交...';

    try {
        // *** 修改: 使用 supabaseClient ***
        const { count: bookingCount, error: countError } = await supabaseClient
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId);
        
        if (countError) throw countError;
        
        // *** 修改: 使用 supabaseClient ***
        const { data: classData, error: classError } = await supabaseClient
            .from('classes')
            .select('capacity')
            .eq('id', classId)
            .single();
            
        if (classError) throw classError;
        
        if (bookingCount >= classData.capacity) {
            throw new Error('抱歉，该课程已满员！');
        }

        // *** 修改: 使用 supabaseClient ***
        const { error: insertError } = await supabaseClient
            .from('bookings')
            .insert([{ class_id: classId, member_name: memberName }]);

        if (insertError) {
            throw insertError;
        }
        
        displayMessage('恭喜您，预约成功！', 'success');
        bookingForm.reset();
        
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
    messageFeedback.className = type;
    
    setTimeout(() => {
        messageFeedback.className = '';
        messageFeedback.textContent = '';
    }, 5000);
}

// 4. 事件监听器
document.addEventListener('DOMContentLoaded', fetchAndDisplayClasses);
bookingForm.addEventListener('submit', handleBooking);
