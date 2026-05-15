import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    createDirtyScope,
    createBeforeUnloadGuard,
    createRouteGuard,
    NAVIGATION_TYPES,
    DIALOG_ACTIONS,
} from '../logic/index.js'

describe('routeGuard - 程序化导航不弹窗', () => {
    let dirtyScope
    let beforeUnloadGuard

    beforeEach(() => {
        dirtyScope = createDirtyScope({ initialState: { name: 'test' } })
        beforeUnloadGuard = createBeforeUnloadGuard(dirtyScope)
    })

    afterEach(() => {
        beforeUnloadGuard.destroy()
    })

    it('程序化导航时即使有未保存更改也不应阻止', () => {
        dirtyScope.setCurrent({ name: 'modified' })
        beforeUnloadGuard.markUserEdited()

        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        const shouldBlock = routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.PROGRAMMATIC,
        })

        expect(shouldBlock).toBe(false)
    })

    it('用户导航时有未保存更改应阻止', () => {
        dirtyScope.setCurrent({ name: 'modified' })
        beforeUnloadGuard.markUserEdited()

        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        const shouldBlock = routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        expect(shouldBlock).toBe(true)
    })

    it('干净状态下即使用户导航也不应阻止', () => {
        beforeUnloadGuard.markUserEdited()

        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        const shouldBlock = routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        expect(shouldBlock).toBe(false)
    })

    it('未标记用户编辑即使有脏数据也不应阻止', () => {
        dirtyScope.setCurrent({ name: 'modified' })

        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        const shouldBlock = routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        expect(shouldBlock).toBe(false)
    })
})

describe('routeGuard - 对话框行为', () => {
    let dirtyScope
    let beforeUnloadGuard

    beforeEach(() => {
        dirtyScope = createDirtyScope({ initialState: { name: 'test' } })
        beforeUnloadGuard = createBeforeUnloadGuard(dirtyScope)
        dirtyScope.setCurrent({ name: 'modified' })
        beforeUnloadGuard.markUserEdited()
    })

    afterEach(() => {
        beforeUnloadGuard.destroy()
    })

    it('阻止导航后应标记对话框可见', () => {
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        expect(routeGuard.isDialogVisible()).toBe(true)
    })

    it('阻止导航后应保存待处理导航信息', () => {
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        const pending = routeGuard.getPendingNavigation()
        expect(pending).toEqual({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })
    })

    it('点击保存并离开应调用保存处理函数', async () => {
        const saveHandler = vi.fn()
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard, {
            saveHandler,
        })

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        await routeGuard.handleDialogAction(DIALOG_ACTIONS.SAVE_AND_LEAVE)

        expect(saveHandler).toHaveBeenCalled()
    })

    it('点击保存并离开应标记为干净', async () => {
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        await routeGuard.handleDialogAction(DIALOG_ACTIONS.SAVE_AND_LEAVE)

        expect(dirtyScope.isDirty()).toBe(false)
    })

    it('点击丢弃并离开应调用丢弃处理函数', async () => {
        const discardHandler = vi.fn()
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard, {
            discardHandler,
        })

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        await routeGuard.handleDialogAction(DIALOG_ACTIONS.DISCARD_AND_LEAVE)

        expect(discardHandler).toHaveBeenCalled()
    })

    it('点击丢弃并离开应重置状态', async () => {
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        await routeGuard.handleDialogAction(DIALOG_ACTIONS.DISCARD_AND_LEAVE)

        expect(dirtyScope.isDirty()).toBe(false)
        expect(dirtyScope.getCurrent()).toEqual({ name: 'test' })
    })

    it('点击留在当前页应关闭对话框但保持脏状态', async () => {
        const routeGuard = createRouteGuard(dirtyScope, beforeUnloadGuard)

        routeGuard.guard({
            from: '/page1',
            to: '/page2',
            navigationType: NAVIGATION_TYPES.USER,
        })

        await routeGuard.handleDialogAction(DIALOG_ACTIONS.STAY)

        expect(routeGuard.isDialogVisible()).toBe(false)
        expect(dirtyScope.isDirty()).toBe(true)
    })
})

describe('beforeUnloadGuard - 基础功能', () => {
    let dirtyScope
    let beforeUnloadGuard

    beforeEach(() => {
        dirtyScope = createDirtyScope({ initialState: { name: 'test' } })
        beforeUnloadGuard = createBeforeUnloadGuard(dirtyScope)
    })

    afterEach(() => {
        beforeUnloadGuard.destroy()
    })

    it('初始状态应禁用', () => {
        expect(beforeUnloadGuard.isEnabled()).toBe(false)
    })

    it('标记用户编辑后应启用', () => {
        beforeUnloadGuard.markUserEdited()
        expect(beforeUnloadGuard.isEnabled()).toBe(true)
        expect(beforeUnloadGuard.hasUserEdited()).toBe(true)
    })

    it('重置编辑标志应清除用户编辑标记', () => {
        beforeUnloadGuard.markUserEdited()
        expect(beforeUnloadGuard.hasUserEdited()).toBe(true)

        beforeUnloadGuard.resetEditFlag()
        expect(beforeUnloadGuard.hasUserEdited()).toBe(false)
    })

    it('应正确设置和获取导航类型', () => {
        beforeUnloadGuard.markProgrammaticNavigation()
        expect(beforeUnloadGuard.getLastNavigationType()).toBe(
            NAVIGATION_TYPES.PROGRAMMATIC
        )

        beforeUnloadGuard.markUserNavigation()
        expect(beforeUnloadGuard.getLastNavigationType()).toBe(
            NAVIGATION_TYPES.USER
        )
    })

    it('shouldBlockNavigation 应正确判断是否需要阻止', () => {
        expect(beforeUnloadGuard.shouldBlockNavigation()).toBe(false)

        dirtyScope.setCurrent({ name: 'modified' })
        expect(beforeUnloadGuard.shouldBlockNavigation()).toBe(false)

        beforeUnloadGuard.markUserEdited()
        expect(beforeUnloadGuard.shouldBlockNavigation()).toBe(true)
    })
})
