import ShortUniqueId from "short-unique-id";

export const AdminGroup = 'codemowers:admins'

class Account {
    #spec = null

    constructor(apiResponse) {
        this.accountId = apiResponse.metadata.name
        this.#spec = apiResponse.spec
        this.resourceVersion = apiResponse.metadata.resourceVersion
        this.emails = apiResponse.status?.emails ?? []
        this.groups = apiResponse.status?.groups ?? []
        this.profile = apiResponse.status?.profile ?? {}
        this.acceptedTos = apiResponse.status?.acceptedTos ?? null
        this.isAdmin = this.groups.includes(AdminGroup)
    }

    /**
     * @param use - can either be "id_token" or "userinfo", depending on
     *   where the specific claims are intended to be put in.
     * @param scope - the intended scope, while oidc-provider will mask
     *   claims depending on the scope automatically you might want to skip
     *   loading some claims from external resources etc. based on this detail
     *   or not return them in id tokens but only userinfo and so on.
     */
    async claims(use, scope) { // eslint-disable-line no-unused-vars
        let claims = {
            sub: this.accountId, // it is essential to always return a sub claim
            groups: this.groups,
            emails: this.emails,
        };
        if (this.profile) {
            claims = {
                ...claims,
                name: this.profile.name,
                company: this.profile.company,
                githubId: this.profile.githubId,
            };
        }
        return claims
    }

    getIntendedStatus() {
        return {
            emails: this.#spec.emails,
            groups: [...(this.#spec.customGroups ?? []), ...(this.#spec.githubGroups ?? [])],
            profile: {
                name: this.#spec.customProfile?.name ?? this.#spec.githubProfile?.name ?? null,
                company: this.#spec.customProfile?.company ?? this.#spec.githubProfile?.company ?? null,
            },
            acceptedTos: this.#spec.acceptedTos,
        }
    }

    getProfileResponse(forAdmin = false) {
        let profile =  {
            emails: this.emails,
            name: this.profile.name,
            company: this.profile.company,
            isAdmin: this.isAdmin,
            groups: this.groups,
        }
        if (forAdmin) {
            profile = {
                ...profile,
                accountId: this.accountId
            }
        }
        return profile
    }

    static getUid()
    {
        const uid = new ShortUniqueId({
            dictionary: 'alphanum_lower',
        });
        return 'u' + uid.stamp(10);
    }

    static async createOrUpdateByEmails(ctx, emails) {
        const user = await ctx.kubeApiService.findUserByEmails(emails)
        if (!user) {
            return await ctx.kubeApiService.createUser(this.getUid(), emails)
        }
        const allEmails = emails.concat(user.emails.filter((item) => emails.indexOf(item) < 0))
        return await ctx.kubeApiService.updateUserSpec({
            accountId: user.accountId,
            emails: allEmails
        });
    }

    static async findAccount(ctx, id, token) { // eslint-disable-line no-unused-vars
        // token is a reference to the token used for which a given account is being loaded,
        // it is undefined in scenarios where account claims are returned from authorization endpoint
        // ctx is the koa request context
        const account = await ctx.kubeApiService.findUser(id)
        return account ? account : null
    }
}

export default Account;
